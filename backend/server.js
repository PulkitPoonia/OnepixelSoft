// Utility: Move old profile pictures to 'old' subfolder
function moveOldProfilePictures() {
  const dir = path.join(__dirname, 'uploads', 'profile-pictures');
  const oldDir = path.join(dir, 'old');
  if (!fs.existsSync(dir)) return;
  if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
  const files = fs.readdirSync(dir).filter(f => !f.startsWith('old'));
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.lstatSync(filePath).isFile()) {
      fs.renameSync(filePath, path.join(oldDir, file));
      console.log(`[CLEANUP] Moved old profile picture: ${file}`);
    }
  }
}
import http from 'http';
import { Server } from "socket.io";
import fs from 'fs';
import path from 'path';
import pkg from 'mongodb';
const { MongoClient, ObjectId } = pkg;
import { handleAdminRoutes, adminAuthHandlers, readJson } from './admin.js';
import { handleChatRoutes, handlePublicFileDownload, initChatSocket } from './chat.js';
import { onlineUsers, userLastSeen } from './presenceStore.js';
import { handleFileManagerRoutes, autoClearOldDeletedFiles } from './filemanager.js';
import { handleTaskRoutes } from './tasks.js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.VITE_CORS_ORIGIN || 'http://localhost:5173';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

let client;
const DB_NAME = process.env.DB_NAME;

/* ================= STATIC ================= */
function serveStaticFile(req, res) {
  if (req.url.startsWith('/uploads/')) {
    // Decode URI so spaces and special chars are handled
    const decodedUrl = decodeURIComponent(req.url);
    const filePath = path.join(__dirname, decodedUrl);

    if (!fs.existsSync(filePath)) {
      console.warn(`[STATIC FILE] Not found: ${filePath} for URL: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    try {
      const stats = fs.statSync(filePath);

      // Set proper content-type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.mp3') contentType = 'audio/mpeg';
      else if (ext === '.webm') contentType = 'audio/webm';

      console.log(`[STATIC FILE] Serving: ${filePath} (${stats.size} bytes) as ${contentType}`);

      // Set headers for streaming with proper caching
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': 'public, max-age=86400', // 24 hour cache
        'ETag': `"${stats.ino}-${stats.mtime.getTime()}"`
      });

      // Stream the file efficiently
      fs.createReadStream(filePath)
        .on('error', (err) => {
          console.error('[STATIC FILE STREAM ERROR]', filePath, err.message);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Server error' }));
          }
        })
        .pipe(res);
      return true;
    } catch (err) {
      console.error('[STATIC FILE ERROR]', filePath, err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Server error' }));
    }
  }
  return false;
}

/* ================= TOKEN ================= */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[TOKEN VERIFY] ✅ Token verified with JWT_SECRET:', decoded.username);
    return decoded;
  } catch (err) {
    console.log('[TOKEN VERIFY] JWT_SECRET failed:', err.message);
    try {
      const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
      console.log('[TOKEN VERIFY] ✅ Token verified with ADMIN_JWT_SECRET:', decoded.username);
      return decoded;
    } catch (adminErr) {
      console.warn('[TOKEN VERIFY] ❌ Both JWT secrets failed. Token:', token?.slice?.(0, 20) + '...', 'JWT Error:', err.message, 'Admin Error:', adminErr.message);
      return null;
    }
  }
}

function getUserFromRequest(req) {
  const auth = req.headers.authorization;
  if (!auth) {
    console.log('[AUTH] No authorization header');
    return null;
  }
  const token = auth.split(' ')[1];
  if (!token) {
    console.log('[AUTH] No token in authorization header');
    return null;
  }
  console.log('[AUTH] Verifying token...');
  return verifyToken(token);
}

/* ================= CORS ================= */
function addCors(res, req) {
 const allowedOrigins = [
  'http://localhost:5173',
  'https://onepixel-soft.vercel.app',
];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
}

async function startServer() {
  // moveOldProfilePictures();
  client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  console.log('✅ MongoDB Connected');

  // Create database indexes for performance
  const db = client.db();
  try {
    // Chat indexes
    await db.collection('chat_conversations').createIndex({ 'participants.username': 1, updatedAt: -1 });
    await db.collection('chat_conversations').createIndex({ isGroup: 1 });
    await db.collection('chat_messages').createIndex({ conversationId: 1, timestamp: -1 });
    await db.collection('chat_messages').createIndex({ conversationId: 1, senderId: 1 });
    await db.collection('chat_messages').createIndex({ conversationId: 1, seenBy: 1 });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    console.log('✅ Database indexes created');
  } catch (err) {
    console.log('⚠️ Index creation warning (may already exist):', err.message);
  }

  // 🧹 Setup auto-cleanup for old deleted files (bin cleanup every 24 hours)
  console.log('🧹 Setting up auto-cleanup for files deleted over 30 days ago...');

  // Run cleanup on startup
  await autoClearOldDeletedFiles(db);

  // Schedule cleanup to run every 24 hours
  const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  setInterval(async () => {
    console.log('🧹 [SCHEDULED] Running auto-cleanup task...');
    await autoClearOldDeletedFiles(db);
  }, CLEANUP_INTERVAL);

  const server = http.createServer(async (req, res) => {
    try {
      if (serveStaticFile(req, res)) return;
      addCors(res, req);

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        return res.end();
      }

      const url = new URL(req.url, `http://localhost:${PORT}`);

      /* ================= UPLOAD PROFILE PICTURE (USER & ADMIN, MULTI) ================= */
      if (req.method === 'POST' && url.pathname === '/api/upload/profile-picture') {
        const user = getUserFromRequest(req);
        if (!user || !user.username) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
        }

        let body = await readJson(req);
        const { filename, data, username } = body || {};
        if (!filename || !data) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Missing file data' }));
        }

        // Only allow admins to upload for other users
        let targetUsernames = [user.username];
        if (user.role === 'admin' && username) {
          if (Array.isArray(username)) {
            targetUsernames = username;
          } else if (username !== user.username) {
            targetUsernames = [username];
          }
        }

        // Decode base64 data
        const matches = data.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Invalid file data' }));
        }
        const ext = filename.split('.').pop().toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!allowed.includes(ext)) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Invalid file type' }));
        }
        const buffer = Buffer.from(matches[2], 'base64');
        
        // Check file size
        if (buffer.length > MAX_FILE_SIZE) {
          const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
          const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          res.writeHead(413);
          return res.end(JSON.stringify({ ok: false, error: `File too large (${sizeMB}MB). Maximum size is ${maxMB}MB.` }));
        }
        
        const safeName = `${targetUsernames[0]}_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'uploads', 'profile-pictures');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        // Move old profile pictures only when updating
//         if (typeof moveOldProfilePictures === 'function') {
//           moveOldProfilePictures();
//         }

        const filePath = path.join(uploadDir, safeName);
        fs.writeFileSync(filePath, buffer);
        // Save to user profile for all usernames
        const db = client.db(DB_NAME);
        await db.collection('users').updateMany(
          { username: { $in: targetUsernames } },
          { $set: { profilePic: `/uploads/profile-pictures/${safeName}` } }
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: `/uploads/profile-pictures/${safeName}` }));
        return;
      }

      /* ================= UPLOAD RESUME (USER & ADMIN, MULTI) ================= */
      if (req.method === 'POST' && url.pathname === '/api/upload/resume') {
        const user = getUserFromRequest(req);
        if (!user || !user.username) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
        }

        let body = await readJson(req);
        const { filename, data, username } = body || {};
        if (!filename || !data) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Missing file data' }));
        }

        // Only allow admins to upload for other users
        let targetUsernames = [user.username];
        if (user.role === 'admin' && username) {
          if (Array.isArray(username)) {
            targetUsernames = username;
          } else if (username !== user.username) {
            targetUsernames = [username];
          }
        }

        // Decode base64 data
        const matches = data.match(/^data:(.+);base64,(.+)$/);
        if (!matches) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'Invalid file data' }));
        }
        const ext = filename.split('.').pop().toLowerCase();
        // Allow all file types for resume
        const buffer = Buffer.from(matches[2], 'base64');
        
        // Check file size
        if (buffer.length > MAX_FILE_SIZE) {
          const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
          const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          res.writeHead(413);
          return res.end(JSON.stringify({ ok: false, error: `File too large (${sizeMB}MB). Maximum size is ${maxMB}MB.` }));
        }
        
        const safeName = `${targetUsernames[0]}_${Date.now()}.${ext}`;
        const uploadDir = path.join(__dirname, 'uploads', 'resumes');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, safeName);
        fs.writeFileSync(filePath, buffer);
        // Save to user profile for all usernames
        const db = client.db(DB_NAME);
        await db.collection('users').updateMany(
          { username: { $in: targetUsernames } },
          { $set: { resume: `/uploads/resumes/${safeName}` } }
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, url: `/uploads/resumes/${safeName}` }));
        return;
      }

      /* ================= LOGIN ================= */
      if (req.method === 'POST' && url.pathname === '/api/login') {
        const body = await readJson(req);
        const { username, password } = body;

        const db = client.db(DB_NAME);

        const user = await db.collection('users').findOne({
          $or: [{ username }, { email: username }]
        });

        if (!user) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, message: "User not found" }));
        }

        if (user.suspended) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, message: "Account is suspended" }));
        }

        const bcrypt = await import('bcryptjs');
        const valid = bcrypt.default.compareSync(password, user.passwordHash);

        if (!valid) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, message: "Invalid password" }));
        }

        const isAdmin = user.role === 'admin' || user.admin === true;

        // Always include permissions: ["users"] for admin JWT
        const jwtPayload = {
          username: user.username,
          role: user.role,
          admin: isAdmin
        };
        if (isAdmin) {
          jwtPayload.permissions = ["users"];
        }

        const accessToken = jwt.sign(
          jwtPayload,
          isAdmin ? process.env.ADMIN_JWT_SECRET : process.env.JWT_SECRET,
          { expiresIn: '8h' }
        );

        console.log('[AUTH] User Login Success Payload:', { username: user.username, isAdmin });

        return res.end(JSON.stringify({
          ok: true,
          accessToken,
          role: user.role,
          user
        }));
      }

      /* ================= ADMIN LOGIN ================= */
      if (await adminAuthHandlers(req, res, client, url)) return;

      /* ================= PUBLIC FILE DOWNLOADS ================= */
      // Allow file downloads without auth
      if (await handlePublicFileDownload(req, res, client, url)) return;

      /* ================= AUTH ================= */
      const user = getUserFromRequest(req);
      req.user = user;

      /* ================= USER ME ================= */
      if (req.method === 'GET' && url.pathname === '/api/me') {
        if (!user) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false }));
        }

        const db = client.db(DB_NAME);
        const dbUser = await db.collection('users').findOne({
          username: user.username
        });

        return res.end(JSON.stringify({
          ok: true,
          user: dbUser,
          role: dbUser.role // ✅ FIXED
        }));
      }

      /* ================= ADMIN ME ================= */
      if (req.method === 'GET' && url.pathname === '/admin/me') {
        if (!user || user.role !== 'admin') {
          res.writeHead(403);
          return res.end(JSON.stringify({ ok: false }));
        }

        const db = client.db(DB_NAME);
        const dbUser = await db.collection('users').findOne({
          username: user.username
        });

        return res.end(JSON.stringify({
          ok: true,
          user: dbUser,
          role: "admin"
        }));
      }

      /* ================= CREATE CONVERSATION ================= */
      if (req.method === 'POST' && url.pathname === '/api/conversations') {
        if (!user) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
        }
        const db = client.db(DB_NAME);
        const body = await readJson(req);
        let participants = Array.isArray(body.participants) ? body.participants : [];
        const groupName = body.groupName || null;

        // ✅ NORMALIZE: Keep only username (and optionally name) from participants
        participants = participants.map(p => ({
          username: p.username,
          ...(p.name ? { name: p.name } : {})
        })).filter(p => p.username);

        // Ensure current user is included
        if (!participants.find(p => p.username === user.username)) {
          participants.push({ username: user.username });
        }
        // Remove duplicates by username
        participants = participants.filter((p, idx, arr) =>
          arr.findIndex(x => x.username === p.username) === idx
        );

        // If it's a group (has groupName or 3+ participants), don't check for existing
        const isGroup = groupName || participants.length >= 3;

        // ✅ CHECK PERMISSION: Only users with canCreateGroups can create groups
        if (isGroup) {
          const dbUser = await db.collection('users').findOne({ username: user.username });
          const hasPermission = 
            dbUser?.role === 'admin' || 
            dbUser?.admin === true || 
            dbUser?.permissions?.canCreateGroups === true;
          
          if (!hasPermission) {
            res.writeHead(403);
            return res.end(JSON.stringify({ ok: false, error: 'You do not have permission to create groups' }));
          }
        }

        // Check if a conversation already exists with these participants
        if (!isGroup) {
          // For 1-on-1 chats: check exact participant match
          const existing = await db.collection('chat_conversations').findOne({
            $and: participants.map(p => ({ 'participants.username': p.username })),
            'participants': { $size: participants.length },
            isGroup: { $ne: true }
          });
          if (existing) {
            return res.end(JSON.stringify({ ok: true, conversationId: existing._id }));
          }
        } else {
          // For groups: check if conversation with same groupName and participants exists
          const existingGroup = await db.collection('chat_conversations').findOne({
            groupName: groupName,
            $and: participants.map(p => ({ 'participants.username': p.username })),
            'participants': { $size: participants.length },
            isGroup: true
          });
          if (existingGroup) {
            return res.end(JSON.stringify({ ok: true, conversationId: existingGroup._id }));
          }
        }

        const result = await db.collection('chat_conversations').insertOne({
          participants,
          isGroup: !!isGroup,
          groupName: groupName,
          groupProfilePic: body.groupProfilePic || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessage: null
        });

        res.end(JSON.stringify({ ok: true, conversationId: result.insertedId }));
        return;
      }

      /* ================= UPDATE CONVERSATION ================= */
      if (req.method === 'PUT' && url.pathname.startsWith('/api/conversations/')) {
        if (!user) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false, message: 'Unauthorized' }));
        }

        const conversationId = url.pathname.split('/').pop();
        const db = client.db(DB_NAME);
        const body = await readJson(req);

        // Log incoming update request for debugging
        console.log('[UPDATE CONVERSATION] Incoming body:', body);

        try {
          const conversation = await db.collection('chat_conversations').findOne({
            _id: new ObjectId(conversationId),
            'participants.username': user.username
          });

          if (!conversation) {
            res.writeHead(404);
            return res.end(JSON.stringify({ ok: false, message: 'Conversation not found or access denied' }));
          }

          // ✅ CHECK PERMISSION: Only users with canManageGroupAccess can update groups
          if (conversation.isGroup === true) {
            const dbUser = await db.collection('users').findOne({ username: user.username });
            const hasPermission = 
              dbUser?.role === 'admin' || 
              dbUser?.admin === true || 
              dbUser?.permissions?.canManageGroupAccess === true;
            
            if (!hasPermission) {
              res.writeHead(403);
              return res.end(JSON.stringify({ ok: false, error: 'You do not have permission to manage group access' }));
            }
          }

          const updateData = {
            updatedAt: new Date()
          };

          if (body.groupName !== undefined) updateData.groupName = body.groupName;
          if (body.groupProfilePic !== undefined) updateData.groupProfilePic = body.groupProfilePic;

          if (body.participants !== undefined) {
            if (!Array.isArray(body.participants)) {
              console.error('[UPDATE CONVERSATION] participants is not an array:', body.participants);
              res.writeHead(400);
              return res.end(JSON.stringify({ ok: false, message: 'participants must be an array' }));
            }
            // Normalize participants
            let newParticipants = body.participants.map(p => ({
              username: p.username,
              ...(p.name ? { name: p.name } : {})
            })).filter(p => p.username);

            // Ensure current user is included
            if (!newParticipants.find(p => p.username === user.username)) {
              newParticipants.push({ username: user.username });
            }

            // Duplicate check
            updateData.participants = newParticipants.filter((p, idx, arr) =>
              arr.findIndex(x => x.username === p.username) === idx
            );
          }

          // Log updateData before DB update
          console.log('[UPDATE CONVERSATION] updateData:', updateData);

          const result = await db.collection('chat_conversations').updateOne(
            { _id: new ObjectId(conversationId) },
            { $set: updateData }
          );

          // Log DB update result
          console.log('[UPDATE CONVERSATION] DB update result:', result);

          if (result.modifiedCount === 0) {
            res.writeHead(500);
            return res.end(JSON.stringify({ ok: false, message: 'No changes saved. DB update failed.' }));
          }

          // Notify participants via socket
          const io = global._appSocketIO;
          if (io) {
            io.to(conversationId).emit('group_updated', {
              conversationId,
              updatedBy: user.username,
              ...updateData
            });
          }
          res.end(JSON.stringify({ ok: true, message: 'Group updated' }));
        } catch (err) {
          console.error('❌ UpdateGroup error:', err);
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false, message: 'Failed to update group', error: err.message, stack: err.stack }));
        }
        return;
      }

      if (req.method === 'GET' && url.pathname.startsWith('/api/users')) {
        // Allow all authenticated users if for chat invite, else admin only
        const isForChat = url.searchParams.get('for') === 'chat' || req.headers['x-for-chat'] === '1';
        if (!user || (!isForChat && user.role !== 'admin' && user.admin !== true)) {
          res.writeHead(403);
          return res.end(JSON.stringify({ ok: false, message: "Admin only" }));
        }

        try {
          const db = client.db(DB_NAME);
          const users = await db.collection('users').find({}).toArray();
          const enrichedUsers = users.map(u => ({
            ...u,
            online: onlineUsers.has(u.username),
            lastSeen: userLastSeen.get(u.username) || null
          }));
          res.end(JSON.stringify({
            ok: true,
            users: enrichedUsers
          }));
          return; // ✅ FIX: Stop processing to avoid double-response
        } catch (err) {
          console.error("❌ /api/users error:", err);
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false }));
          return; // ✅ FIX: Stop processing
        }
      }

      /* ================= CHAT AUTH ================= */
      if (url.pathname.startsWith('/api/chat')) {
        if (!user) {
          res.writeHead(401);
          return res.end(JSON.stringify({ ok: false }));
        }
      }

      /* ================= ROUTES ================= */
      // Route /api/users PUT/POST to admin handler for adminToken support
      if ((req.method === 'PUT' || req.method === 'POST') && url.pathname === '/api/users') {
        if (await handleAdminRoutes(req, res, client, url)) return;
      }

      // Route /api/user-permissions POST to admin handler
      if (req.method === 'POST' && url.pathname === '/api/user-permissions') {
        if (await handleAdminRoutes(req, res, client, url)) return;
      }

      // File Manager Routes (require authentication)
      if (url.pathname.startsWith('/api/files') || url.pathname.startsWith('/api/storage')) {
        if (user) {
          const db = client.db(DB_NAME);
          if (await handleFileManagerRoutes(req, res, db, user)) {
            return;
          }
        } else {
          if (!res.headersSent) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
          }
        }
      }

      // Task Routes (require authentication)
      if (url.pathname.startsWith('/api/tasks')) {
        if (user) {
          if (await handleTaskRoutes(req, res, client, url, user, io)) {
            return;
          }
        } else {
          if (!res.headersSent) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ok: false, error: 'Unauthorized' }));
          }
        }
      }

      if (await handleChatRoutes(req, res, client, url)) return;
      if (await handleAdminRoutes(req, res, client, url)) return;

      res.writeHead(404);
      res.end(JSON.stringify({ ok: false }));

    } catch (err) {
      console.error('❌ Server Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false }));
      }
    }
  });

  /* ================= SOCKET ================= */
  const io = new Server(server, {
    cors: { origin: CORS_ORIGIN }
  });

  
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      console.log("[SOCKET AUTH] Received token:", token);

      if (!token) {
        console.log("❌ No socket token");
        return next(new Error("No token"));
      }

      const decoded = verifyToken(token);
      console.log("[SOCKET AUTH] Decoded user:", decoded);

      if (!decoded) {
        console.log("❌ Invalid socket token");
        return next(new Error("Invalid token"));
      }

      socket.user = decoded; 
      next();
    } catch (err) {
      next(new Error("Socket auth failed"));
    }
  });

  initChatSocket(io, client);

 
  server.keepAliveTimeout = 75000; 
  server.headersTimeout = 80000; 
  server.requestTimeout = 600000; 

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();