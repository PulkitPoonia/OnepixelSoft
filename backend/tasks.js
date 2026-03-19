import { ObjectId } from 'mongodb';
import { queueNotification } from './notificationStore.js';
import { onlineUsers } from './presenceStore.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_NAME = process.env.DB_NAME;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Helper function to ensure project files directory exists
function ensureProjectFilesDir() {
  const projectFilesDir = path.join(__dirname, 'uploads', 'project-files');
  if (!fs.existsSync(projectFilesDir)) {
    fs.mkdirSync(projectFilesDir, { recursive: true });
  }
  return projectFilesDir;
}

// Helper function to generate unique filename
function generateUniqueName(filename) {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${name}-${timestamp}-${random}${ext}`;
}

// Helper function to save base64 file to disk
function saveBase64File(base64String, filename) {
  try {
    const projectFilesDir = ensureProjectFilesDir();
    const uniqueName = generateUniqueName(filename);
    const filePath = path.join(projectFilesDir, uniqueName);

    // Remove data URL prefix if present
    const base64Data = base64String.replace(/^data:.*;base64,/, '');

    // Convert to buffer to check size
    const buffer = Buffer.from(base64Data, 'base64');

    // Check file size
    if (buffer.length > MAX_FILE_SIZE) {
      const sizeMB = (buffer.length / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw new Error(`File too large (${sizeMB}MB). Maximum size is ${maxMB}MB.`);
    }

    // Write to disk
    fs.writeFileSync(filePath, buffer);
    console.log(`[FILE] Saved attachment: ${uniqueName}`);

    return uniqueName;
  } catch (e) {
    console.error('[FILE] Error saving base64 file:', e);
    throw e;
  }
}

// Helper function to delete file from disk
function deleteFile(filename) {
  try {
    const projectFilesDir = ensureProjectFilesDir();
    const filePath = path.join(projectFilesDir, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[FILE] Deleted attachment: ${filename}`);
    }
  } catch (e) {
    console.error('[FILE] Error deleting file:', e);
    // Don't throw - file might already be deleted
  }
}

export async function handleTaskRoutes(req, res, client, url, user, io) {
  if (!user) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return true;
  }

  // Log io availability at start
  if (!io) {
    console.warn('⚠️ [TASKS ROUTE] WARNING: io parameter is NOT available in handleTaskRoutes');
  } else {
    console.log('✅ [TASKS ROUTE] io parameter is available in handleTaskRoutes');
  }

  const db = client.db(process.env.DB_NAME);
  const tasksCollection = db.collection('tasks_projects');

  // JWT token only stores username/role/admin - fetch full user record to get _id
  if (!user._id) {
    try {
      const dbUser = await db.collection('users').findOne({ username: user.username });
      if (dbUser) {
        user._id = dbUser._id;
      }
    } catch (e) {
      console.error('[TASKS ROUTE] Failed to load user from DB:', e.message);
    }
  }
  const pathname = url.pathname;
  const method = req.method;

  /* ================= GET PROJECTS ================= */
  if (pathname === '/api/tasks/projects' && method === 'GET') {
    try {
      // Get projects created by user OR assigned to user
      const projects = await tasksCollection.find({
        $or: [
          { userId: user._id },
          { assignedUsers: user._id }
        ]
      }).toArray();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, projects }));
      return true;
    } catch (e) {
      console.error('Error fetching projects:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch projects' }));
      return true;
    }
  }

  /* ================= CREATE PROJECT ================= */
  if (pathname === '/api/tasks/projects' && method === 'POST') {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        // Check permissions: Admin can always create projects, others need canAccessTasklist permission
        const isAdmin = user.role === 'admin';

        // Get fresh permissions from database (not just JWT token)
        const db = client.db(DB_NAME);

        // Handle both string _id from JWT and ObjectId from DB
        let userId = user._id;
        if (typeof userId === 'string') {
          userId = new ObjectId(userId);
        }

        const dbUser = await db.collection('users').findOne({ _id: userId });
        const hasProjectPermission = dbUser && dbUser.permissions && dbUser.permissions.canAccessTasklist;

        console.log('🔍 CREATE PROJECT Permission Check:', {
          userId: user._id,
          isAdmin,
          dbUser: dbUser ? { username: dbUser.username, permissions: dbUser.permissions } : null,
          hasProjectPermission
        });

        if (!isAdmin && !hasProjectPermission) {
          console.log('❌ Permission denied - user lacks canAccessTasklist');
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'You do not have permission to create projects. Contact administrator.' }));
          return;
        }

        const project = JSON.parse(body);
        project.userId = user._id;
        project.createdAt = new Date().toISOString();
        project.tasks = [];
        project.assignedUsers = []; // Initially no assigned users
        project.attachments = []; // Initialize attachments array

        const result = await tasksCollection.insertOne(project);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          project: { ...project, _id: result.insertedId }
        }));
      });
      return true;
    } catch (e) {
      console.error('Error creating project:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create project' }));
      return true;
    }
  }

  /* ================= UPDATE PROJECT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+$/) && method === 'PUT') {
    try {
      const projectId = pathname.split('/').pop();

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const updatedData = JSON.parse(body);

        // Allow update if user is creator OR admin
        const isAdmin = user.role === 'admin';
        const updateFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can update any project
          : { _id: new ObjectId(projectId), userId: user._id };

        const result = await tasksCollection.updateOne(
          updateFilter,
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return true;
    } catch (e) {
      console.error('Error updating project:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to update project' }));
      return true;
    }
  }

  /* ================= DELETE PROJECT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+$/) && method === 'DELETE') {
    try {
      const projectId = pathname.split('/').pop().trim();

      console.log('[PROJECT DELETE] Starting delete for projectId:', projectId);

      // STEP 1: Count total projects
      const totalCount = await tasksCollection.countDocuments({});

      // STEP 2: Try different ways to find the project
      let project = null;
      let foundWith = null;

      try {
        project = await tasksCollection.findOne({ _id: new ObjectId(projectId) });
        if (project) foundWith = 'ObjectId';
      } catch (e) {
        // ObjectId parsing failed, try as string
        project = await tasksCollection.findOne({ _id: projectId });
        if (project) foundWith = 'string';
      }

      // STEP 3: Return result with details
      if (!project) {
        console.log('[PROJECT DELETE] Project not found');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          error: 'Project not found',
          debug: {
            projectId,
            totalProjectsInDb: totalCount,
            searchedWith: ['ObjectId', 'string']
          }
        }));
        return true;
      }

      console.log('[PROJECT DELETE] Found project:', { name: project.name, userId: project.userId?.toString() });

      // STEP 4: Permission check
      const isCreator = project.userId?.toString ? project.userId.toString() === user._id.toString() : String(project.userId) === String(user._id);
      const isAdmin = user.role === 'admin';
      const hasPermission = isCreator || isAdmin;

      console.log('[PROJECT DELETE] Permission check:', { isCreator, isAdmin, hasPermission });

      if (!hasPermission) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Permission denied' }));
        return true;
      }

      // STEP 5: Delete
      let result = null;
      try {
        result = await tasksCollection.deleteOne({ _id: new ObjectId(projectId) });
      } catch (e) {
        result = await tasksCollection.deleteOne({ _id: projectId });
      }

      console.log('[PROJECT DELETE] Delete result:', { deletedCount: result.deletedCount });

      if (result.deletedCount === 0) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Failed to delete project' }));
        return true;
      }

      console.log('[PROJECT DELETE] ✅ Project deleted successfully');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;

    } catch (e) {
      console.error('[PROJECT DELETE] ❌ Error deleting project:', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete project', details: e.message }));
      return true;
    }
  }

  /* ================= CREATE TASK ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks$/) && method === 'POST') {
    try {
      const projectId = pathname.split('/')[4];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const task = JSON.parse(body);
        task._id = new ObjectId();
        task.createdAt = new Date().toISOString();

        // Check permissions: Admin can always create tasks, others need canAccessTasklist permission
        const isAdmin = user.role === 'admin';

        // Get fresh permissions from database (not just JWT token)
        const db = client.db(DB_NAME);
        const dbUser = await db.collection('users').findOne({ _id: user._id });
        const hasTaskPermission = dbUser && dbUser.permissions && dbUser.permissions.canAccessTasklist;

        console.log('🔍 CREATE TASK Permission Check:', {
          userId: user._id,
          projectId,
          isAdmin,
          dbUser: dbUser ? { username: dbUser.username, permissions: dbUser.permissions } : null,
          hasTaskPermission
        });

        if (!isAdmin && !hasTaskPermission) {
          console.log('❌ Permission denied - user lacks canAccessTasklist');
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'You do not have permission to create tasks. Contact administrator.' }));
          return;
        }

        // Allow task creation if user is creator OR admin
        const createTaskFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can create in any project
          : { _id: new ObjectId(projectId), userId: user._id };  // Regular users can only create in their own

        const result = await tasksCollection.updateOne(
          createTaskFilter,
          { $push: { tasks: task } }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
          return;
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, task }));
      });
      return true;
    } catch (e) {
      console.error('Error creating task:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create task' }));
      return true;
    }
  }

  /* ================= UPDATE TASK ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks\/[^/]+$/) && method === 'PUT') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const taskId = parts[6];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const updatedData = JSON.parse(body);

        // Build update object with proper nested path
        const updateObj = {};
        for (const key in updatedData) {
          updateObj[`tasks.$[elem].${key}`] = updatedData[key];
        }

        // Allow update if user is creator OR admin
        const isAdmin = user.role === 'admin';
        const updateTaskFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can update in any project
          : { _id: new ObjectId(projectId), userId: user._id };  // Regular users can only update in their own

        const result = await tasksCollection.updateOne(
          updateTaskFilter,
          { $set: updateObj },
          { arrayFilters: [{ "elem._id": new ObjectId(taskId) }] }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return true;
    } catch (e) {
      console.error('Error updating task:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to update task' }));
      return true;
    }
  }

  /* ================= DELETE TASK ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks\/[^/]+$/) && method === 'DELETE') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const taskId = parts[6];

      // Allow deletion if user is creator OR admin
      const isAdmin = user.role === 'admin';
      const deleteTaskFilter = isAdmin
        ? { _id: new ObjectId(projectId) }  // Admins can delete from any project
        : { _id: new ObjectId(projectId), userId: user._id };  // Regular users can only delete from their own

      const result = await tasksCollection.updateOne(
        deleteTaskFilter,
        { $pull: { tasks: { _id: new ObjectId(taskId) } } }
      );

      if (result.matchedCount === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
        return true;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    } catch (e) {
      console.error('Error deleting task:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete task' }));
      return true;
    }
  }

  /* ================= ADD USER TO PROJECT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/assign-user$/) && method === 'POST') {
    try {
      const projectId = pathname.split('/')[4];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const { userId } = JSON.parse(body);

        // Allow assignment if user is creator OR admin
        const isAdmin = user.role === 'admin';
        const updateFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can assign to any project
          : { _id: new ObjectId(projectId), userId: user._id };  // Regular users can only assign to their own

        const result = await tasksCollection.updateOne(
          updateFilter,
          { $addToSet: { assignedUsers: new ObjectId(userId) } }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));

        // 🔔 NEW: Persistent Push Notification for the newly assigned user
        if (result.matchedCount > 0 && io) {
          (async () => {
            try {
              const db = client.db();
              const [assignedUser, project] = await Promise.all([
                db.collection('users').findOne({ _id: new ObjectId(userId) }),
                db.collection('tasks_projects').findOne({ _id: new ObjectId(projectId) }, { projection: { name: 1 } })
              ]);

              if (assignedUser && project) {
                const notification = {
                  icon: '📁',
                  title: 'Added to a project',
                  body: `${user.username} added you to "${project.name}"`,
                  link: '/apps/todo/task-list'
                };

                const targetUsername = assignedUser.username;
                if (onlineUsers.has(targetUsername)) {
                  console.log(`🔔 [NOTIF] Sending real-time assignment notification to: ${targetUsername}`);
                  io.to(targetUsername).emit('push_notification', notification);
                } else {
                  console.log(`📥 [NOTIF] Queuing offline assignment notification for: ${targetUsername}`);
                  await queueNotification(db, targetUsername, notification);
                }
              }
            } catch (err) {
              console.error('❌ [NOTIF] Error processing assignment notification:', err);
            }
          })();
        }
      });
      return true;
    } catch (e) {
      console.error('Error adding user to project:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to add user to project' }));
      return true;
    }
  }

  /* ================= REMOVE USER FROM PROJECT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/remove-user$/) && method === 'POST') {
    try {
      const projectId = pathname.split('/')[4];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const { userId } = JSON.parse(body);

        // Allow removal if user is creator OR admin
        const isAdmin = user.role === 'admin';
        const updateFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can remove from any project
          : { _id: new ObjectId(projectId), userId: user._id };
        const result = await tasksCollection.updateOne(
          updateFilter,
          { $pull: { assignedUsers: new ObjectId(userId) } }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
      return true;
    } catch (e) {
      console.error('Error removing user from project:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to remove user from project' }));
      return true;
    }
  }

  /* ================= ADD COMMENT TO TASK ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks\/[^/]+\/comments$/) && method === 'POST') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const taskId = parts[6];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const { text } = JSON.parse(body);

        const userId = user._id ? user._id.toString() : String(user.id || 'unknown');
        const comment = {
          id: new ObjectId().toString(),
          text,
          author: {
            id: userId,
            username: user.username,
            email: user.email,
            name: user.username || user.email || 'Unknown User'
          },
          createdAt: new Date().toISOString()
        };

        console.log(`💬 Adding comment - UserID: ${userId}, Username: ${user.username}, Email: ${user.email}`);

        // Allow comment if user is assigned to project OR creator OR admin
        const isAdmin = user.role === 'admin';

        const commentFilter = isAdmin
          ? { _id: new ObjectId(projectId) }  // Admins can comment on any project's tasks
          : {
            _id: new ObjectId(projectId),
            $or: [
              { userId: user._id },
              { assignedUsers: user._id }
            ]
          };

        const result = await tasksCollection.updateOne(
          commentFilter,
          {
            $push: { "tasks.$[elem].comments": comment }
          },
          { arrayFilters: [{ "elem._id": new ObjectId(taskId) }] }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project or task not found, or permission denied' }));
          return;
        }

        console.log(`✅ Comment added - CommentID: ${comment.id}, AuthorID: ${userId}`);

        // Broadcast comment event to other users
        const roomId = `task-${projectId}-${taskId}`;
        const broadcastData = {
          projectId,
          taskId,
          id: comment.id,
          commentId: comment.id,
          author: comment.author
        };

        console.log(`📊 [BROADCAST] Preparing to send comment_added event:`, {
          roomId,
          authorUsername: comment.author.username,
          authorId: comment.author.id,
          commentText: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : '')
        });

        if (io) {
          // Get room size
          const roomSize = io.sockets.adapter.rooms?.get(roomId)?.size || 0;

          // Only broadcast to room members (for real-time UI updates)
          io.to(roomId).emit('comment_added', broadcastData);
          console.log(`📢 [BROADCAST] Sent comment_added to room "${roomId}" (${roomSize} members)`);

          // 🔔 NEW: Persistent Push Notifications for assigned users
          (async () => {
            try {
              const db = client.db();
              const project = await db.collection('tasks_projects').findOne({ _id: new ObjectId(projectId) });
              if (!project) return;

              // Users to notify: Owner (userId) + Assigned Users (minus the sender)
              const recipientIds = new Set();
              if (project.userId) recipientIds.add(project.userId);
              if (project.assignedUsers) {
                project.assignedUsers.forEach(id => recipientIds.add(String(id)));
              }

              // Fetch usernames for all identified user IDs
              const recipients = await db.collection('users').find({
                _id: { $in: Array.from(recipientIds).map(id => new ObjectId(id)) }
              }).project({ username: 1 }).toArray();

              const recipientUsernames = new Set(recipients.map(u => u.username));

              // Remove sender
              recipientUsernames.delete(user.username);

              const notification = {
                icon: '💬',
                title: 'New comment on task',
                body: `${user.username}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
                link: '/apps/todo/task-list'
              };

              for (const recipient of recipientUsernames) {
                if (onlineUsers.has(recipient)) {
                  console.log(`🔔 [NOTIF] Sending real-time notification to: ${recipient}`);
                  io.to(recipient).emit('push_notification', notification);
                } else {
                  console.log(`📥 [NOTIF] Queuing offline notification for: ${recipient}`);
                  await queueNotification(db, recipient, notification);
                }
              }
            } catch (err) {
              console.error('❌ [NOTIF] Error processing comment notifications:', err);
            }
          })();
        } else {
          console.error('❌ [BROADCAST] io is NOT available - cannot broadcast comment_added');
        }

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, comment }));
      });
      return true;
    } catch (e) {
      console.error('Error adding comment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to add comment' }));
      return true;
    }
  }

  /* ================= UPDATE COMMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks\/[^/]+\/comments\/[^/]+$/) && method === 'PUT') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const taskId = parts[6];
      const commentId = parts[8];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        const { text } = JSON.parse(body);

        // Get the current user's ID for comparison
        const userId = user._id ? user._id.toString() : String(user.id || 'unknown');
        const isAdmin = user.role === 'admin';

        console.log(`✏️ Edit comment - UserID: ${userId}, CommentID: ${commentId}, IsAdmin: ${isAdmin}`);

        // First, find the project and task to check comment author
        const project = await tasksCollection.findOne(
          { _id: new ObjectId(projectId) },
          { projection: { tasks: 1 } }
        );

        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
          return true;
        }

        // Find the task
        const task = project.tasks.find(t => t._id.toString() === taskId || t._id === taskId);
        if (!task) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Task not found' }));
          return true;
        }

        // Ensure comments array exists
        if (!task.comments || !Array.isArray(task.comments)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'No comments found' }));
          return true;
        }

        // Find the comment
        const comment = task.comments.find(c => c.id === commentId);
        if (!comment) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Comment not found' }));
          return true;
        }

        // Check if user is the comment author or an admin
        const authorId = comment.author?.id;
        console.log(`📝 Comparing - AuthorID: ${authorId}, UserID: ${userId}`);
        const isCommentAuthor = String(authorId) === String(userId);

        if (!isCommentAuthor && !isAdmin) {
          console.log(`❌ Permission denied - Not author or admin`);
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'You can only edit your own comments' }));
          return true;
        }

        console.log(`✅ Permission granted - Updating comment ${commentId}`);

        // Update the comment
        const result = await tasksCollection.updateOne(
          { _id: new ObjectId(projectId) },
          {
            $set: {
              "tasks.$[task].comments.$[comment].text": text,
              "tasks.$[task].comments.$[comment].updatedAt": new Date().toISOString()
            }
          },
          {
            arrayFilters: [
              { "task._id": new ObjectId(taskId) },
              { "comment.id": commentId }
            ]
          }
        );

        if (result.modifiedCount === 0) {
          console.log(`❌ Failed to update comment in DB`);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Failed to update comment' }));
          return true;
        }

        console.log(`✅ Comment updated successfully`);

        // Broadcast comment update event to other users
        const roomId = `task-${projectId}-${taskId}`;
        const broadcastData = {
          projectId,
          taskId,
          commentId,
          text,
          updatedAt: new Date().toISOString(),
          author: comment.author
        };

        console.log(`📊 [BROADCAST] Preparing to send comment_updated event:`, {
          roomId,
          commentId,
          authorUsername: comment.author.username
        });

        if (io) {
          // Get room size
          const roomSize = io.sockets.adapter.rooms?.get(roomId)?.size || 0;
          const totalConnected = io.sockets.sockets.size;

          // Only broadcast to room members
          io.to(roomId).emit('comment_updated', broadcastData);
          console.log(`📢 [BROADCAST] Sent to room "${roomId}" (${roomSize} members)`);
        } else {
          console.error('❌ [BROADCAST] io is NOT available - cannot broadcast comment_updated');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return true;
      });
      return true;
    } catch (e) {
      console.error('Error updating comment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to update comment' }));
      return true;
    }
  }

  /* ================= DELETE COMMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/tasks\/[^/]+\/comments\/[^/]+$/) && method === 'DELETE') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const taskId = parts[6];
      const commentId = parts[8];

      // Get the current user's ID for comparison
      const userId = user._id ? user._id.toString() : String(user.id || 'unknown');
      const isAdmin = user.role === 'admin';

      console.log(`🗑️ Delete comment - UserID: ${userId}, CommentID: ${commentId}, IsAdmin: ${isAdmin}`);

      // First, find the project and task to check comment author
      const project = await tasksCollection.findOne(
        { _id: new ObjectId(projectId) },
        { projection: { tasks: 1 } }
      );

      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
        return true;
      }

      // Find the task
      const task = project.tasks.find(t => t._id.toString() === taskId || t._id === taskId);
      if (!task) {
        console.log(`❌ Task not found. TaskID: ${taskId}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Task not found' }));
        return true;
      }

      // Ensure comments array exists
      if (!task.comments || !Array.isArray(task.comments)) {
        console.log(`❌ Comments array missing or invalid for task ${taskId}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'No comments found' }));
        return true;
      }

      // Find the comment
      const comment = task.comments.find(c => c.id === commentId);
      if (!comment) {
        console.log(`❌ Comment not found. CommentID: ${commentId}, Available: ${task.comments.map(c => c.id).join(',')}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Comment not found' }));
        return true;
      }

      // Check if user is the comment author or an admin
      const authorId = comment.author?.id;
      console.log(`📝 Comparing - AuthorID: ${authorId}, UserID: ${userId}`);
      const isCommentAuthor = String(authorId) === String(userId);

      if (!isCommentAuthor && !isAdmin) {
        console.log(`❌ Permission denied - Not author or admin`);
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'You can only delete your own comments' }));
        return true;
      }

      console.log(`✅ Permission granted - Deleting comment ${commentId}`);

      // Delete the comment
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { "tasks.$[elem].comments": { id: commentId } } },
        { arrayFilters: [{ "elem._id": new ObjectId(taskId) }] }
      );

      if (result.modifiedCount === 0) {
        console.log(`❌ Failed to delete comment from DB`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Failed to delete comment' }));
        return true;
      }

      console.log(`✅ Comment deleted successfully`);

      // Broadcast comment delete event to other users
      const roomId = `task-${projectId}-${taskId}`;
      const broadcastData = {
        projectId,
        taskId,
        commentId,
        author: comment.author
      };

      console.log(`📊 [BROADCAST] Preparing to send comment_deleted event:`, {
        roomId,
        commentId,
        authorUsername: comment.author.username
      });

      if (io) {
        // Get room size
        const roomSize = io.sockets.adapter.rooms?.get(roomId)?.size || 0;
        const totalConnected = io.sockets.sockets.size;

        // Only broadcast to room members
        io.to(roomId).emit('comment_deleted', broadcastData);
        console.log(`📢 [BROADCAST] Sent to room "${roomId}" (${roomSize} members)`);
      } else {
        console.error('❌ [BROADCAST] io is NOT available - cannot broadcast comment_deleted');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    } catch (e) {
      console.error('Error deleting comment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete comment' }));
      return true;
    }
  }

  /* ================= ADD PROJECT ATTACHMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/attachments$/) && method === 'POST') {
    try {
      const projectId = pathname.split('/')[4];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const fileData = JSON.parse(body);

          // Save file to disk
          const diskFilename = saveBase64File(fileData.fileData, fileData.filename);

          // Create attachment metadata (without fileData)
          const attachment = {
            _id: new ObjectId(),
            filename: fileData.filename,
            diskFilename: diskFilename,
            mimeType: fileData.mimeType,
            fileSize: fileData.fileSize,
            fileType: fileData.fileType || 'new',
            uploadedBy: user._id,
            uploadedByUsername: user.username,
            uploadedAt: new Date().toISOString()
          };

          // Allow attachment upload if user is creator OR admin OR assigned to project
          const isAdmin = user.role === 'admin';
          const updateFilter = isAdmin
            ? { _id: new ObjectId(projectId) }
            : {
              _id: new ObjectId(projectId),
              $or: [
                { userId: user._id },
                { assignedUsers: user._id }
              ]
            };

          const result = await tasksCollection.updateOne(
            updateFilter,
            { $push: { attachments: attachment } }
          );

          if (result.matchedCount === 0) {
            deleteFile(diskFilename); // Clean up the uploaded file
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
            return;
          }

          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, attachment }));
        } catch (e) {
          console.error('Error processing attachment upload:', e);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid file data' }));
        }
      });
      return true;
    } catch (e) {
      console.error('Error uploading attachment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to upload attachment' }));
      return true;
    }
  }

  /* ================= GET PROJECT ATTACHMENTS ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/attachments$/) && method === 'GET') {
    try {
      const projectId = pathname.split('/')[4];

      // Allow fetch if user is creator OR admin OR assigned to project
      const isAdmin = user.role === 'admin';
      const queryFilter = isAdmin
        ? { _id: new ObjectId(projectId) }
        : {
          _id: new ObjectId(projectId),
          $or: [
            { userId: user._id },
            { assignedUsers: user._id }
          ]
        };

      const project = await tasksCollection.findOne(
        queryFilter,
        { projection: { attachments: 1 } }
      );

      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Project not found or permission denied' }));
        return true;
      }

      const attachments = (project.attachments || []).map(att => ({
        ...att,
        downloadUrl: `/api/tasks/projects/${projectId}/attachments/${att._id}/download`
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, attachments }));
      return true;
    } catch (e) {
      console.error('Error fetching attachments:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch attachments' }));
      return true;
    }
  }

  /* ================= DOWNLOAD PROJECT ATTACHMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/attachments\/[^/]+\/download$/) && method === 'GET') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const attachmentId = parts[6];

      // Get project to find attachment
      const project = await tasksCollection.findOne(
        { _id: new ObjectId(projectId) },
        { projection: { attachments: 1, userId: 1, assignedUsers: 1 } }
      );

      if (!project) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Project not found' }));
        return true;
      }

      const attachment = project.attachments?.find(a => a._id.toString() === attachmentId);
      if (!attachment) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Attachment not found' }));
        return true;
      }

      // Check permission
      const isAdmin = user.role === 'admin';
      const isCreator = project.userId.toString() === user._id.toString();
      const isAssigned = project.assignedUsers.some(uid => uid.toString() === user._id.toString());
      const canDownload = isAdmin || isCreator || isAssigned;

      if (!canDownload) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Permission denied' }));
        return true;
      }

      // Serve file from disk
      const projectFilesDir = ensureProjectFilesDir();
      const filePath = path.join(projectFilesDir, attachment.diskFilename);

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File not found on disk' }));
        return true;
      }

      const stats = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': attachment.mimeType || 'application/octet-stream',
        'Content-Length': stats.size,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`
      });

      fs.createReadStream(filePath).pipe(res);
      return true;
    } catch (e) {
      console.error('Error downloading attachment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to download attachment' }));
      return true;
    }
  }

  /* ================= UPDATE PROJECT ATTACHMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/attachments\/[^/]+$/) && method === 'PUT') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const attachmentId = parts[6];

      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const fileData = JSON.parse(body);

          // Allow update if user is creator OR admin OR attachment uploader
          const isAdmin = user.role === 'admin';

          // First check if attachment exists and user can update it
          const project = await tasksCollection.findOne(
            { _id: new ObjectId(projectId) },
            { projection: { attachments: 1, userId: 1, assignedUsers: 1 } }
          );

          if (!project) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
            return;
          }

          const attachment = project.attachments?.find(a => a._id.toString() === attachmentId);
          if (!attachment) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Attachment not found' }));
            return;
          }

          // Check permission
          const isUploader = attachment.uploadedBy.toString() === user._id.toString();
          const isCreator = project.userId.toString() === user._id.toString();
          const isAssigned = project.assignedUsers.some(uid => uid.toString() === user._id.toString());
          const canUpdate = isAdmin || isCreator || (isAssigned && isUploader);

          if (!canUpdate) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Permission denied' }));
            return;
          }

          // Save new file to disk
          const newDiskFilename = saveBase64File(fileData.fileData, fileData.filename);

          // Delete old file from disk
          deleteFile(attachment.diskFilename);

          // Update the attachment in MongoDB
          const result = await tasksCollection.updateOne(
            { _id: new ObjectId(projectId) },
            {
              $set: {
                "attachments.$[elem].filename": fileData.filename,
                "attachments.$[elem].diskFilename": newDiskFilename,
                "attachments.$[elem].mimeType": fileData.mimeType,
                "attachments.$[elem].fileSize": fileData.fileSize,
                "attachments.$[elem].updatedAt": new Date().toISOString()
              }
            },
            { arrayFilters: [{ "elem._id": new ObjectId(attachmentId) }] }
          );

          if (result.modifiedCount === 0) {
            deleteFile(newDiskFilename); // Clean up the new file
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'Failed to update attachment' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, attachment }));
        } catch (e) {
          console.error('Error processing attachment update:', e);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid file data' }));
        }
      });
      return true;
    } catch (e) {
      console.error('Error updating attachment:', e);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to update attachment' }));
      return true;
    }
  }

  /* ================= DELETE PROJECT ATTACHMENT ================= */
  if (pathname.match(/^\/api\/tasks\/projects\/[^/]+\/attachments\/[^/]+$/) && method === 'DELETE') {
    try {
      const parts = pathname.split('/');
      const projectId = parts[4];
      const attachmentId = parts[6];

      console.log('[ATTACHMENT DELETE] Starting delete:', { projectId, attachmentId, userId: user._id.toString() });

      // Allow deletion if user is creator OR admin OR attachment uploader
      const isAdmin = user.role === 'admin';

      // First check if attachment exists and user can delete it
      const project = await tasksCollection.findOne(
        { _id: new ObjectId(projectId) },
        { projection: { attachments: 1, userId: 1 } }
      );

      if (!project) {
        console.log('[ATTACHMENT DELETE] Project not found');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Project not found' }));
        return true;
      }

      // Try multiple ways to match the attachment
      let attachment = project.attachments?.find(a => {
        const aIdStr = a._id?.toString ? a._id.toString() : String(a._id);
        const match = aIdStr === attachmentId;
        console.log('[ATTACHMENT DELETE] Comparing:', { aIdStr, attachmentId, match });
        return match;
      });

      if (!attachment) {
        console.log('[ATTACHMENT DELETE] Attachment not found. Available IDs:', project.attachments?.map(a => a._id?.toString ? a._id.toString() : String(a._id)));
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Attachment not found' }));
        return true;
      }

      console.log('[ATTACHMENT DELETE] Found attachment:', { filename: attachment.filename, diskFilename: attachment.diskFilename });

      // Check permission
      const isUploader = attachment.uploadedBy?.toString ? attachment.uploadedBy.toString() === user._id.toString() : String(attachment.uploadedBy) === String(user._id);
      const isCreator = project.userId?.toString ? project.userId.toString() === user._id.toString() : String(project.userId) === String(user._id);
      const canDelete = isAdmin || isCreator || isUploader;

      console.log('[ATTACHMENT DELETE] Permission check:', { isAdmin, isCreator, isUploader, canDelete });

      if (!canDelete) {
        console.log('[ATTACHMENT DELETE] Permission denied');
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Permission denied' }));
        return true;
      }

      // Delete file from disk
      try {
        deleteFile(attachment.diskFilename);
        console.log('[ATTACHMENT DELETE] File deleted from disk');
      } catch (fileErr) {
        console.error('[ATTACHMENT DELETE] Error deleting file from disk:', fileErr);
        // Continue - MongoDB record deletion is more important
      }

      // Delete the attachment from MongoDB
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(projectId) },
        { $pull: { attachments: { _id: attachment._id } } }  // Use the actual _id object
      );

      console.log('[ATTACHMENT DELETE] MongoDB update result:', { modifiedCount: result.modifiedCount });

      if (result.modifiedCount === 0) {
        console.log('[ATTACHMENT DELETE] Failed to modify document');
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Failed to delete attachment' }));
        return true;
      }

      console.log('[ATTACHMENT DELETE] ✅ Attachment deleted successfully');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return true;
    } catch (e) {
      console.error('[ATTACHMENT DELETE] ❌ Error deleting attachment:', e.message, e.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete attachment', details: e.message }));
      return true;
    }
  }

  return false;
}
