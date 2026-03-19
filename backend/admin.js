import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb'; 
import { onlineUsers, userLastSeen } from './presenceStore.js';

/* ================= READ JSON ================= */
async function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', err => reject(err));
  });
}

/* ================= VERIFY ADMIN TOKEN ================= */
function verifyAdminToken(req) {
  const adminSecret = process.env.ADMIN_JWT_SECRET || 'change-me';
  const userSecret = process.env.JWT_SECRET || 'change-me';
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);

  if (!m) return { ok: false, code: 401 };

  let decoded = null;
  try {
    decoded = jwt.verify(m[1], adminSecret);
  } catch {
    try {
      decoded = jwt.verify(m[1], userSecret);
    } catch {
      return { ok: false, code: 401 };
    }
  }

  if (decoded.role !== 'admin' && decoded.admin !== true) {
    console.log('[DEBUG] verifyAdminToken: Role is not admin:', { role: decoded.role, admin: decoded.admin });
    return { ok: false, code: 403 };
  }
  console.log('[DEBUG] verifyAdminToken: Success for user:', decoded.username);
  return { ok: true, decoded };
}

/* ================= ADMIN ROUTES ================= */
export async function handleAdminRoutes(req, res, client, url) {
  const pathname = url.pathname;
  const db = client.db(process.env.DB_NAME);

 
  const isUsersRoute = pathname === '/users' || pathname === '/api/users';

  /* ================= CREATE USER (POST) ================= */
  if (req.method === 'POST' && isUsersRoute) {
    const v = verifyAdminToken(req);
    if (!v.ok) {
      res.writeHead(v.code);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    // ✅ FIX: Check if user has permission to create users
    const d = v.decoded || {};
    const adminPermissions = d.permissions || [];
    const hasUsersPermission = 
      adminPermissions.includes('users') || 
      d.isSuperAdmin === true || 
      d.admin === true || 
      d.role === 'admin';

    if (!hasUsersPermission) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'No permission to create users' }));
      return true;
    }

    const body = await readJson(req);
    const { username, email, password, name, role, phone, position, resume, profilePic } = body || {};

    if (!username || !email || !password) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'missing fields' }));
      return true;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      username,
      email,
      name: name || '',
      phone: phone || '',
      position: position || '',
      resume: resume || '',
      profilePic: profilePic || '',
      passwordHash,
      role: role || 'user',
      suspended: false,
      permissions: {
        canCreateGroups: false,
        canManageGroupAccess: false,
        canAccessTasklist: false
      },
      createdAt: new Date()
    };

    const r = await db.collection('users').insertOne(user);

    res.writeHead(201);
    res.end(JSON.stringify({ ok: true, user: { ...user, _id: r.insertedId } }));
    return true;
  }

  /* ================= UPDATE USER (PUT)  ================= */
  if (req.method === 'PUT' && isUsersRoute) {
    const v = verifyAdminToken(req);
    if (!v.ok) {
      res.writeHead(v.code);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    // ✅ FIX: Check if user has permission to update users
    const d = v.decoded || {};
    const adminPermissions = d.permissions || [];
    const hasUsersPermission = 
      adminPermissions.includes('users') || 
      d.isSuperAdmin === true || 
      d.admin === true || 
      d.role === 'admin';
    
    console.log('[DEBUG] update user check:', { 
      username: d.username, 
      role: d.role,
      admin: d.admin,
      permissions: adminPermissions, 
      hasUsersPermission 
    });

    if (!hasUsersPermission) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'No permission to update users' }));
      return true;
    }

    const body = await readJson(req);
    const { id, username, email, password, name, role, phone, position, resume, profilePic } = body || {};

    if (!id) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'User ID required' }));
      return true;
    }

    const updateData = {
      username,
      email,
      name: name || '',
      role: role || 'user',
      phone: phone || '',
      position: position || '',
      resume: resume || '',
      profilePic: profilePic || ''
    };

    // Only update the password if a new one was actually typed in
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Remove empty fields so we don't accidentally erase data
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  /* ================= GET USERS ================= */
  if (req.method === 'GET' && isUsersRoute) {
    const v = verifyAdminToken(req);
    if (!v.ok) {
      res.writeHead(v.code);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    // ✅ FIX: Check if user has permission to view users
    try {
      const d = v.decoded || {};
      const adminPermissions = d.permissions || [];
      const hasUsersPermission = 
        adminPermissions.includes('users') || 
        d.isSuperAdmin === true || 
        d.admin === true || 
        d.role === 'admin';

      if (!hasUsersPermission) {
        res.writeHead(403);
        res.end(JSON.stringify({ ok: false, error: 'No permission to view users' }));
        return true;
      }

      const users = await db.collection('users').find({}).toArray();
      const enrichedUsers = users.map(u => ({
        ...u,
        online: onlineUsers.has(u.username),
        lastSeen: userLastSeen.get(u.username) || null
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, users: enrichedUsers }));
    } catch (error) {
      console.error('Fetch users error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: 'Failed to fetch users' }));
    }

    return true;
  }

  /* ================= TOGGLE SUSPEND USER (PATCH) ================= */
  if (req.method === 'PATCH' && isUsersRoute) {
    const v = verifyAdminToken(req);
    if (!v.ok) {
      res.writeHead(v.code);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    // ✅ FIX: Check if user has permission to update users
    const d = v.decoded || {};
    const adminPermissions = d.permissions || [];
    const hasUsersPermission = 
      adminPermissions.includes('users') || 
      d.isSuperAdmin === true || 
      d.admin === true || 
      d.role === 'admin';

    if (!hasUsersPermission) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'No permission to update users' }));
      return true;
    }

    const body = await readJson(req);
    const { id, suspended } = body || {};

    if (!id || suspended === undefined) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'User ID and suspended status required' }));
      return true;
    }

    try {
      await db.collection('users').updateOne(
        { _id: new ObjectId(id) },
        { $set: { suspended: suspended } }
      );

      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      console.error('Toggle suspend error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: 'Failed to toggle suspend status' }));
    }

    return true;
  }

  /* ================= MANAGE USER PERMISSIONS (POST) ================= */
  if (req.method === 'POST' && pathname === '/api/user-permissions') {
    const v = verifyAdminToken(req);
    if (!v.ok) {
      res.writeHead(v.code);
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    // Check admin permission
    const d = v.decoded || {};
    const isAdmin = d.role === 'admin' || d.admin === true;

    if (!isAdmin) {
      res.writeHead(403);
      res.end(JSON.stringify({ ok: false, error: 'Only admins can manage permissions' }));
      return true;
    }

    const body = await readJson(req);
    const { userId, permissions } = body || {};

    if (!userId || !permissions || typeof permissions !== 'object') {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: 'User ID and permissions object required' }));
      return true;
    }

    try {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { permissions: permissions } }
      );

      res.writeHead(200);
      res.end(JSON.stringify({ ok: true }));
    } catch (error) {
      console.error('Update permissions error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: 'Failed to update permissions' }));
    }

    return true;
  }

  return false;
}

/* ================= AUTH HANDLERS ================= */
export async function adminAuthHandlers(req, res, client, url) {
  const pathname = url.pathname;
  const db = client.db(process.env.DB_NAME);

  /* ================= ADMIN LOGIN ================= */
  if (req.method === 'POST' && pathname === '/admin/login') {
    const body = await readJson(req);

    const username = (body?.username || '').trim().toLowerCase();
    const password = (body?.password || '').trim();

    const user = await db.collection('users').findOne({
      $or: [
        { email: { $regex: `^${username}$`, $options: 'i' } },
        { username: { $regex: `^${username}$`, $options: 'i' } }
      ]
    });

    if (!user || (user.role !== 'admin' && user.admin !== true)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Admin not found' }));
      return true;
    }

    if (user.suspended) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Account is suspended' }));
      return true;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Invalid password' }));
      return true;
    }

    /* ================= TOKENS ================= */
    const isAdmin = user.role === 'admin' || user.admin === true;
    
    const accessToken = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username, 
        role: isAdmin ? 'admin' : user.role,
        admin: isAdmin,
        permissions: isAdmin ? ["users"] : []
      },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '8h' }
    );

    const refreshToken = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username, 
        role: isAdmin ? 'admin' : user.role,
        admin: isAdmin,
        permissions: isAdmin ? ["users"] : []
      },
      process.env.ADMIN_REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    console.log('[AUTH] Admin Login Success Payload:', { username: user.username, isAdmin });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: isAdmin ? 'admin' : user.role,
        admin: isAdmin
      }
    }));

    return true;
  }

  /* ================= REFRESH TOKEN ================= */
  if (req.method === 'POST' && pathname === '/admin/refresh-token') {
    const { refreshToken } = await readJson(req);

    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.ADMIN_REFRESH_TOKEN_SECRET
      );

      const newAccessToken = jwt.sign(
        { 
          id: decoded.id, 
          username: decoded.username, 
          role: decoded.role,
          admin: decoded.admin,
          permissions: decoded.permissions || []
        },
        process.env.ADMIN_JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, accessToken: newAccessToken }));
    } catch (err) {
      console.error('Refresh error:', err);
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Invalid refresh token' }));
    }

    return true;
  }

  return false;
}

export { readJson };