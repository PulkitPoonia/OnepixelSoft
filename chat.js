import { readJson } from './admin.js';
import { ObjectId, GridFSBucket } from 'mongodb';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ================= MEMORY ================= */
export const onlineUsers = new Set();
export const userLastSeen = new Map();
const userDataCache = new Map(); // Cache user data to avoid repeated DB lookups
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache unread counts to avoid expensive aggregation queries
const unreadCountCache = new Map(); // { userId: { conversationId: count, ... } }
const UNREAD_CACHE_TTL = 2 * 60 * 1000; // 2 minutes (more aggressive since messages change)



/* ================= CHAT ROUTES ================= */
export async function handlePublicFileDownload(req, res, client, url) {
  try {
    let pathname = url.pathname;
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);

    // GET /api/chat/file/:fileId - Download file from GridFS (public access)
    if (req.method === 'GET' && pathname.match(/^\/api\/chat\/file\/[a-f0-9]{24}$/)) {
      try {
        const fileId = pathname.split('/').pop();
        console.log('📥 [DOWNLOAD] Requested file:', fileId);

        const db = client.db();
        const bucket = new GridFSBucket(db);
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

        // Set response headers for file download
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'inline'
        });

        // Stream the file to the client
        downloadStream.on('error', (err) => {
          console.error('❌ [DOWNLOAD] Error:', err);
          if (!res.headersSent) {
            res.writeHead(404);
            res.end(JSON.stringify({ ok: false, error: 'File not found' }));
          }
        });

        downloadStream.pipe(res);
        return true;
      } catch (err) {
        console.error('❌ [DOWNLOAD] Handler error:', err);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false, error: 'Failed to download file' }));
        }
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('❌ [DOWNLOAD] Error:', err);
    return false;
  }
}

export async function handleChatRoutes(req, res, client, url) {
  try {
    let pathname = url.pathname;
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);

    const user = req.user;

    if (!user || !user.username) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    const username = user.username;
    const db = client.db();

    /* ================= GET CONVERSATIONS ================= */
    if (req.method === 'GET' && pathname === '/api/chat/conversations') {

      const conversations = await db
        .collection('chat_conversations')
        .find({ 'participants.username': username })
        .project({
          _id: 1,
          participants: 1,
          isGroup: 1,
          groupName: 1,
          groupProfilePic: 1,
          lastMessage: 1,
          updatedAt: 1,
          createdAt: 1,
          messageCount: 1
        })
        .sort({ updatedAt: -1 })
        .limit(100)  // Limit to 100 most recent conversations
        .toArray();

      const timeStart = Date.now();

      // ✅ FIX: Batch fetch all user data instead of N+1 queries
      const allUsernames = [...new Set(
        conversations.flatMap(conv => conv.participants.map(p => p.username))
      )];

      const usersMap = {};
      if (allUsernames.length > 0) {
        const allUsers = await db.collection('users')
          .find(
            { username: { $in: allUsernames } },
            { projection: { username: 1, profilePic: 1, name: 1 } }
          )
          .toArray();
        
        allUsers.forEach(u => {
          usersMap[u.username] = u;
        });
      }

      // ✅ OPTIMIZATION: Calculate actual unread count per conversation
      const unreadMap = {};
      
      // Get all unique conversation IDs
      const convIds = conversations.map(c => c._id);
      
      if (convIds.length > 0) {
      const unreadCounts = await db.collection('chat_messages')
  .aggregate([
    {
      $match: {
        conversationId: { $in: convIds.map(id => String(id)) },
        senderId: { $ne: username },     // exclude my own messages
        seenBy: { $nin: [username] }
      }
    },
    {
      $group: {
        _id: "$conversationId",
        count: { $sum: 1 }
      }
    }
  ])
          .toArray();

        console.log(`📊 Unread count query for user ${username}:`, unreadCounts);

        unreadCounts.forEach(item => {
          unreadMap[item._id] = item.count || 0;
        });
      }

      const timeTaken = Date.now() - timeStart;
      if (timeTaken > 100) console.log(`⚡ GET conversations: ${timeTaken}ms for ${conversations.length} conversations`);

      const result = conversations.map(conv => {
        const participants = conv.participants.map(p => {
          const userData = usersMap[p.username] || {};
          return {
            username: p.username,
            name: userData.name || p.username,
            profilePic: userData.profilePic || '',
            online: onlineUsers.has(p.username),
            lastSeen: userLastSeen.get(p.username) || null
          };
        });

        return {
          ...conv,
          participants,
          unreadCount: unreadMap[String(conv._id)] || 0,
          lastMessage: conv.lastMessage || null,
        };
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, conversations: result }));
      return true;
    }

    /* ================= GET MESSAGES ================= */
    if (req.method === 'GET') {
      const match = pathname.match(/^\/api\/chat\/([^/]+)\/messages$/);

      if (match) {
        const conversationId = match[1];
        
        // ✅ FIX: Add pagination support
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const skip = parseInt(url.searchParams.get('skip') || '0');

        const totalCount = await db.collection('chat_messages').countDocuments({
          conversationId: String(conversationId),
          deletedForEveryone: { $ne: true },
          $or: [
            { deletedFor: { $exists: false } },
            { deletedFor: { $nin: [username] } }
          ]
        });

        const messages = await db.collection('chat_messages')
          .find({
            conversationId: String(conversationId),
            deletedForEveryone: { $ne: true },
            $or: [
              { deletedFor: { $exists: false } },
              { deletedFor: { $nin: [username] } }
            ]
          })
          .project({
            _id: 1,
            conversationId: 1,
            senderId: 1,
            senderName: 1,
            text: 1,
            timestamp: 1,
            seenBy: 1,
            deliveredTo: 1,
            reactions: 1,
            replyTo: 1,
            deletedFor: 1
          })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .toArray()
          .then(msgs => msgs.reverse()); // Reverse to get chronological order

        // Fetch sender names in batch for messages that don't have senderName
        const senderIds = [...new Set(
          messages
            .filter(m => !m.senderName && m.senderId)
            .map(m => m.senderId)
        )];

        const senderNames = {};
        if (senderIds.length > 0) {
          const senders = await db.collection('users')
            .find(
              { username: { $in: senderIds } },
              { projection: { username: 1, name: 1 } }
            )
            .toArray();
          senders.forEach(s => {
            senderNames[s.username] = s.name || s.username;
          });
        }

        // Enrich messages with sender names
        const enrichedMessages = messages.map(msg => ({
          ...msg,
          senderName: msg.senderName || senderNames[msg.senderId] || msg.senderId
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          ok: true, 
          messages: enrichedMessages,
          totalCount,
          limit,
          skip,
          hasMore: skip + limit < totalCount
        }));
        return true;
      }
    }

    /* ================= MARK READ ================= */
    if (req.method === 'POST' && pathname === '/api/chat/mark-read') {

      const { conversationId } = await readJson(req);

      await db.collection('chat_messages').updateMany(
        {
          conversationId: String(conversationId),
          senderId: { $ne: username }
        },
        {
          $addToSet: { seenBy: username }
        }
      );

      // Invalidate unread count cache for this user after marking as read
      unreadCountCache.delete(username);

      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
      return true;
    }

    /* ================= DOWNLOAD FILE FROM DATABASE ================= */
    if (req.method === 'GET' && pathname.match(/^\/api\/chat\/file\/[a-f0-9]{24}$/)) {
      try {
        const fileId = pathname.split('/').pop();
        const bucket = new GridFSBucket(db);

        const cursor = bucket.find({ _id: new ObjectId(fileId) });
        const [fileInfo] = await cursor.toArray();

        if (!fileInfo) {
          res.writeHead(404);
          res.end(JSON.stringify({ ok: false, error: 'File not found' }));
          return true;
        }

        // Check if user owns the file
        if (fileInfo.metadata?.owner !== username) {
          res.writeHead(403);
          res.end(JSON.stringify({ ok: false, error: 'Access denied' }));
          return true;
        }

        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

        res.writeHead(200, {
          'Content-Type': fileInfo.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileInfo.filename}"`,
          'Content-Length': fileInfo.length
        });

        downloadStream.pipe(res);
        
        downloadStream.on('error', (err) => {
          console.error('❌ Download stream error:', err);
          if (!res.headersSent) {
            res.writeHead(500);
            res.end(JSON.stringify({ ok: false, error: 'Download failed' }));
          }
        });

        return true;
      } catch (err) {
        console.error('❌ Download file error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: err.message }));
        return true;
      }
    }

    /* ================= UPLOAD FILE ================= */
    if (req.method === 'POST' && pathname === '/api/chat/upload') {
      try {
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        
        let fileName = 'file';
        let foundFile = false;
        let fileSize = 0;
        let buffer = Buffer.alloc(0);

        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
        if (!boundaryMatch) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Invalid content-type' }));
          return;
        }

        const boundary = boundaryMatch[1];

        // Collect file data in memory
        let fileData = Buffer.alloc(0);

        req.on('data', (chunk) => {
          buffer = Buffer.concat([buffer, chunk]);

          if (!foundFile) {
            const headerEnd = buffer.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
              const headerPart = buffer.slice(0, headerEnd).toString('utf8');
              const fileNameMatch = headerPart.match(/filename="([^"]+)"/);
              if (fileNameMatch) {
                fileName = fileNameMatch[1];
                console.log('📁 [UPLOAD] Extracted fileName from multipart:', { fileName, headerPart: headerPart.slice(0, 200) });
                foundFile = true;
                buffer = buffer.slice(headerEnd + 4);
                console.log('📁 Starting file upload to DB:', { fileName });
              }
            }
          }

          if (foundFile) {
            const nextBoundaryIndex = buffer.lastIndexOf('\r\n--' + boundary);
            
            if (nextBoundaryIndex !== -1) {
              const dataToWrite = buffer.slice(0, nextBoundaryIndex);
              fileSize += dataToWrite.length;
              fileData = Buffer.concat([fileData, dataToWrite]);
              buffer = buffer.slice(nextBoundaryIndex + 2);
            } else if (buffer.length > 10) {
              const safeSize = Math.max(0, buffer.length - 50);
              const dataToWrite = buffer.slice(0, safeSize);
              fileSize += dataToWrite.length;
              if (dataToWrite.length > 0) {
                fileData = Buffer.concat([fileData, dataToWrite]);
              }
              buffer = buffer.slice(safeSize);
            }
          }
        });

        req.on('end', async () => {
          try {
            if (fileSize === 0) {
              res.writeHead(400);
              res.end(JSON.stringify({ ok: false, error: 'No file found in upload' }));
              return;
            }

            const ext = path.extname(fileName);
            const basename = path.basename(fileName, ext).substring(0, 50);
            const uniqueFileName = `${basename}_${timestamp}_${randomStr}${ext}`;

            // Store in GridFS
            const bucket = new GridFSBucket(db);
            const uploadStream = bucket.openUploadStream(uniqueFileName, {
              metadata: {
                owner: username,
                originalName: fileName,
                uploadedAt: new Date(),
                size: fileSize
              }
            });

            uploadStream.write(fileData);
            uploadStream.end();

            uploadStream.on('finish', () => {
              console.log('✅ File uploaded to GridFS:', { fileName, uniqueFileName, fileId: uploadStream.id });
              console.log('✅ [UPLOAD RESPONSE] About to send fileId:', uploadStream.id.toString(), 'fileName:', fileName);
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              const responseData = { 
                ok: true, 
                fileId: uploadStream.id.toString(),
                fileName: fileName,
                size: fileSize
              };
              console.log('✅ [UPLOAD RESPONSE] Sending JSON:', JSON.stringify(responseData));
              res.end(JSON.stringify(responseData));
            });

            uploadStream.on('error', (err) => {
              console.error('❌ GridFS upload error:', err);
              if (!res.headersSent) {
                res.writeHead(500);
                res.end(JSON.stringify({ ok: false, error: 'Failed to upload to database' }));
              }
            });

          } catch (err) {
            console.error('❌ Upload end handler error:', err);
            if (!res.headersSent) {
              res.writeHead(500);
              res.end(JSON.stringify({ ok: false, error: err.message }));
            }
          }
        });

        req.on('error', (err) => {
          console.error('❌ Upload request error:', err);
          res.writeHead(500);
          res.end(JSON.stringify({ ok: false, error: 'Upload failed' }));
        });

      } catch (err) {
        console.error('❌ Upload handler error:', err);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return true;
    }

    return false;

  } catch (err) {
    console.error('❌ CHAT ERROR:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false }));
    return true;
  }
}

/* ================= SOCKET ================= */
export function initChatSocket(io, client) {

  if (!global._appSocketIO) global._appSocketIO = io;

  io.on('connection', (socket) => {

    
    const username = socket.user?.username;

    if (!username) {
      console.log("❌ Socket connection rejected: No username found");
      return;
    }

    socket.username = username;
    socket.isIntentionalLogout = false;

    console.log('✅ Socket connected:', username);

    onlineUsers.add(username);
    io.emit('user_online', { username });

    
    socket.join(username);

    const db = client.db();

    // Join all conversation rooms for this user on connect
(async () => {
  try {
    const conversations = await db
      .collection('chat_conversations')
      .find({ 'participants.username': username })
      .project({ _id: 1 })
      .toArray();

    conversations.forEach(conv => {
      socket.join(String(conv._id));
      console.log(`📦 ${username} auto-joined conversation room ${conv._id}`);
    });
  } catch (err) {
    console.error('❌ Failed to auto-join conversation rooms', err);
  }
})();

    /* ================= JOIN ================= */
    socket.on('join', (roomId) => {
      socket.join(String(roomId));
      const roomStr = String(roomId);
      console.log(`📦 [SOCKET] ${username} joined room: ${roomStr}`);
      console.log(`📊 [SOCKET] Room "${roomStr}" now has ${io.sockets.adapter.rooms.get(roomStr)?.size || 0} members`);
    });

    socket.on('leave', (roomId) => {
      socket.leave(String(roomId));
      const roomStr = String(roomId);
      console.log(`🚪 [SOCKET] ${username} left room: ${roomStr}`);
      console.log(`📊 [SOCKET] Room "${roomStr}" now has ${io.sockets.adapter.rooms.get(roomStr)?.size || 0} members`);
    });

    /* ================= TYPING ================= */
    socket.on('typing', ({ roomId }) => {
      socket.to(roomId).emit('typing', { username });
    });

    socket.on('stop_typing', ({ roomId }) => {
      socket.to(roomId).emit('stop_typing', { username });
    });

    /* ================= SEND MESSAGE ================= */
    socket.on('send_message', async (data) => {

      // Get sender's full name from cache or fetch once
      let senderName = username;
      if (userDataCache.has(username)) {
        const cached = userDataCache.get(username);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
          senderName = cached.name || username;
        } else {
          userDataCache.delete(username);
        }
      }
      
      if (!userDataCache.has(username)) {
        const user = await db.collection('users').findOne({ username });
        if (user) {
          userDataCache.set(username, { name: user.name, timestamp: Date.now() });
          senderName = user.name || username;
        }
      }

      const msg = {
        conversationId: String(data.conversationId),
        senderId: username,
        senderName: senderName,
        text: data.text,
        timestamp: new Date(),
        deliveredTo: [username],
        seenBy: [username],
        replyTo: data.replyTo || null,
        reactions: {},
        deletedForEveryone: false
      };

      try {
        const result = await db.collection('chat_messages').insertOne(msg);
        msg._id = result.insertedId;

        console.log('💬 Message inserted:', { id: msg._id, conversationId: msg.conversationId, seenBy: msg.seenBy, deliveredTo: msg.deliveredTo });

        // Invalidate unread caches for all users to reflect the new message
        unreadCountCache.clear();

        // ✅ Try to update existing conversation
        const updateResult = await db.collection('chat_conversations').updateOne(
          { _id: new ObjectId(data.conversationId) },
          {
            $set: {
              lastMessage: msg,
              updatedAt: new Date()
            }
          }
        );

        if (updateResult.matchedCount === 0) {
          console.warn('⚠️ WARNING: Conversation not found for message:', { 
            conversationId: data.conversationId, 
            messageId: msg._id,
            senderId: msg.senderId,
            reason: 'Conversation should have been created before message was sent'
          });
          // Don't auto-create - let the error be visible
        } else {
          console.log('✅ Conversation updated:', { conversationId: data.conversationId });
        }

      } catch (err) {
        console.error('❌ Insert message error:', err);
      }

      
      // ✅ Fetch full conversation for newer/unknown participants
      const conversation = await db.collection('chat_conversations').findOne(
        { _id: new ObjectId(data.conversationId) }
      );

      if (!conversation) {
        console.warn('⚠️ CRITICAL: Conversation not found in database!', {
          conversationId: data.conversationId,
          messageId: msg._id,
          senderId: msg.senderId
        });
      } else {
        console.log('✅ Conversation found:', {
          conversationId: conversation._id,
          participantsCount: conversation.participants?.length || 0,
          isGroup: conversation.isGroup,
          lastMessageId: msg._id,
          participantUsernames: conversation.participants?.map(p => p.username || p) || []
        });
      }

      const msgToSend = {
        _id: msg._id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp,
        reactions: msg.reactions || {},
        seenBy: msg.seenBy || [],
        deliveredTo: msg.deliveredTo || [],
        replyTo: msg.replyTo || null,
        // ✅ Include conversation data so frontend can create entry if needed
        conversationData: conversation ? {
          _id: String(conversation._id),
          conversationId: String(conversation._id),
          participants: conversation.participants || [],
          isGroup: conversation.isGroup || false,
          groupName: conversation.groupName || null,
          groupIcon: conversation.groupIcon || null,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          lastMessage: msg,
          messageCount: 0 // Will be calculated by frontend
        } : null
      };

      console.log('📤 Emitting receive_message:', { 
        id: msgToSend._id?.toString?.().slice(-6), 
        conversationId: msgToSend.conversationId,
        isGroup: msgToSend.conversationData?.isGroup,
        groupName: msgToSend.conversationData?.groupName,
        room: String(data.conversationId)
      });
      
      // Emit to conversation room
      io.to(String(data.conversationId)).emit('receive_message', msgToSend);

    });

    /* ================= ❤️ REACTION ================= */
    socket.on('react_message', async ({ messageId, emoji, conversationId }) => {
      try {
      
        const existing = await db.collection('chat_messages').findOne({
          _id: new ObjectId(messageId),
          [`reactions.${emoji}`]: username
        });

        if (existing) {
          // Remove reaction
          await db.collection('chat_messages').updateOne(
            { _id: new ObjectId(messageId) },
            { $pull: { [`reactions.${emoji}`]: username } }
          );
        } else {
          // Add reaction
          await db.collection('chat_messages').updateOne(
            { _id: new ObjectId(messageId) },
            { $addToSet: { [`reactions.${emoji}`]: username } }
          );
        }

        // Get updated reactions
        const updated = await db.collection('chat_messages').findOne(
          { _id: new ObjectId(messageId) },
          { projection: { reactions: 1 } }
        );

        io.to(String(conversationId)).emit('reaction_update', {
          messageId,
          conversationId,
          reactions: updated?.reactions || {}
        });

      } catch (err) {
        console.error('❌ Reaction error:', err);
      }
    });

/* ================= DELETE MESSAGE ================= */
    socket.on('delete_message', async ({ messageId, conversationId, forEveryone }) => {
      try {
        // 1. DELETE FOR EVERYONE LOGIC
        if (forEveryone === true || forEveryone === 'true') {
          
          
          await db.collection('chat_messages').updateOne(
            { _id: new ObjectId(messageId) },
            { 
              $set: { 
                text: "", 
                deletedForEveryone: true 
              } 
            }
          );

          // Update last message - use aggregation for efficiency
          const lastMsgResult = await db.collection('chat_messages').aggregate([
            { $match: { conversationId: String(conversationId), deletedForEveryone: { $ne: true } } },
            { $sort: { timestamp: -1 } },
            { $limit: 1 },
            { $project: { _id: 1, text: 1, timestamp: 1, senderId: 1, senderName: 1 } }
          ]).toArray();

          if (lastMsgResult.length > 0) {
            await db.collection('chat_conversations').updateOne(
              { _id: new ObjectId(conversationId) },
              {
                $set: {
                  lastMessage: lastMsgResult[0],
                  updatedAt: new Date()
                }
              }
            );
          }

      
          io.to(String(conversationId)).emit('message_deleted', {
            messageId,
            conversationId,
            user: username, 
            forEveryone: true
          });

        } else {
          
          const updateResult = await db.collection('chat_messages').findOneAndUpdate(
            { _id: new ObjectId(messageId) },
            { $addToSet: { deletedFor: username } },
            { returnDocument: 'after' } 
          );

          const updatedMessage = updateResult?.value || updateResult;

          console.log('🗑️ Delete for me - Message updated:', {
            messageId,
            deletedFor: updatedMessage?.deletedFor
          });
          
       
          socket.emit('message_deleted', {
            messageId,
            conversationId,
            user: username,
            forEveryone: false
          });
        }
      } catch (err) {
        console.error('❌ delete error', err);
      }
    });

    /* ================= DELETE CONVERSATION ================= */
socket.on('delete_conversation', async ({ conversationId }) => {
  try {
    await db.collection('chat_messages').updateMany(
      { conversationId: String(conversationId) },
      { $addToSet: { deletedFor: username } }
    );


    await db.collection('chat_conversations').updateOne(
      { _id: new ObjectId(conversationId) },
      { $addToSet: { deletedBy: username } } 
    );

 
    socket.emit('conversation_deleted', { conversationId });
  } catch (err) {
    console.error('❌ delete conversation error', err);
  }
});

    /* ================= DELIVERED ================= */
    socket.on('message_delivered', async ({ messageId, conversationId }) => {
      try {
        console.log('📦 message_delivered received:', { messageId, conversationId, username });
        
        const result = await db.collection('chat_messages').updateOne(
          { _id: new ObjectId(messageId) },
          { $addToSet: { deliveredTo: username } }
        );
        
        console.log('✅ Updated message:', { modifiedCount: result.modifiedCount, deliveredTo: username });
        
        // Get updated message to broadcast latest state
        const updatedMsg = await db.collection('chat_messages').findOne(
          { _id: new ObjectId(messageId) }
        );
        
        // Emit to all users in the conversation
        io.to(String(conversationId)).emit('message_delivered', {
          messageId,
          conversationId,
          deliveredTo: username,
          allDeliveredTo: updatedMsg?.deliveredTo || [username]
        });
        
        console.log('✅ Emitted message_delivered to room');
      } catch (err) {
        console.error('delivery error', err);
      }
    });

    /* ================= SEEN ================= */
    socket.on('message_seen', async ({ conversationId, messageIds }) => {
      try {
        if (!messageIds || messageIds.length === 0) {
          console.log('⚠️ MESSAGE_SEEN: No messageIds provided');
          return;
        }

        // Convert messageIds to ObjectIds
        const msgIds = (messageIds || []).map(id => {
          try {
            // If it's already an ObjectId, return it; if string, convert it
            if (typeof id === 'object' && id._id) return id._id;
            return new ObjectId(String(id));
          } catch (err) {
            console.error('❌ Failed to convert messageId:', id, err.message);
            return null;
          }
        }).filter(id => id !== null);

        if (msgIds.length === 0) {
          console.log('⚠️ MESSAGE_SEEN: No valid messageIds after conversion');
          return;
        }

        console.log('🔔 MESSAGE_SEEN Starting:', { conversationId, username, messageIds: msgIds.map(id => id.toString().slice(-6)) });

        // Only mark the specific messages as seen, not all messages
        const result = await db.collection('chat_messages').updateMany(
          {
            _id: { $in: msgIds },
            senderId: { $ne: username },
          },
          {
            $addToSet: { seenBy: username },
          }
        );

        console.log('🔔 MESSAGE_SEEN Result:', { conversationId, username, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });

        if (result.modifiedCount === 0) {
          console.warn('⚠️ MESSAGE_SEEN: No messages were updated! Check if messages exist or user is already in seenBy');
        }

        // Invalidate this user's unread cache since they just marked messages as seen
        unreadCountCache.delete(username);

        const room = String(conversationId);
        const payload = { conversationId, seenBy: username };
        
        io.to(room).emit('messages_seen', payload);

      } catch (err) {
        console.error('❌ seen error', err);
      }
    });

    /* ================= USER LOGGING OUT ================= */
    socket.on('user_logging_out', () => {
      console.log('🚪 User logging out:', username);
      
      socket.isIntentionalLogout = true;
      
      onlineUsers.delete(username);
      
      const lastSeen = new Date();
      userLastSeen.set(username, lastSeen);
      
      io.emit('user_offline', {
        username,
        lastSeen
      });
      
      console.log('✅ Emitted user_offline for logout');
    });

    /* ================= DISCONNECT ================= */
    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', username, '| isIntentionalLogout:', socket.isIntentionalLogout);

      if (socket.isIntentionalLogout) {
        console.log('🔴 Logout - marking user offline');
        onlineUsers.delete(username);
        const lastSeen = new Date();
        userLastSeen.set(username, lastSeen);
        io.emit('user_offline', { username, lastSeen });
      } else {
        console.log('🟡 Unintentional disconnect - keeping user online (socket will auto-reconnect)');
      }
    });
  });
}