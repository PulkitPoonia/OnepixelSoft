

import pkg from 'mongodb';

const { ObjectId } = pkg;

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
        const project = JSON.parse(body);
        project.userId = user._id;
        project.createdAt = new Date().toISOString();
        project.tasks = [];
        project.assignedUsers = []; // Initially no assigned users

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
if (pathname.match(/^\/api\/tasks\/projects\/[^/]+$/) && method === 'DELETE' && !pathname.includes('/tasks')) {
  try {
    const projectId = pathname.split('/').pop().trim();
    
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
    
    // STEP 4: Permission check
    const isCreator = project.userId.toString() === user._id.toString();
    const isAdmin = user.role === 'admin';
    const hasPermission = isCreator || isAdmin;
    
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
    
    if (result.deletedCount === 0) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Failed to delete project' }));
      return true;
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;

  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
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

        // Allow task creation if user is creator OR admin
        const isAdmin = user.role === 'admin';
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
          comment,
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
          const totalConnected = io.sockets.sockets.size;
          
          // Broadcast to room members (if they joined)
          io.to(roomId).emit('comment_added', broadcastData);
          console.log(`📢 [BROADCAST] Sent to room "${roomId}" (${roomSize} members)`);
          
          // Also broadcast to all connected users as fallback
          io.emit('comment_added', broadcastData);
          console.log(`📡 [BROADCAST] Sent to ALL connected users (${totalConnected} total)`);
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
          
          // Broadcast to room members (if they joined)
          io.to(roomId).emit('comment_updated', broadcastData);
          console.log(`📢 [BROADCAST] Sent to room "${roomId}" (${roomSize} members)`);
          
          // Also broadcast to all connected users as fallback
          io.emit('comment_updated', broadcastData);
          console.log(`📡 [BROADCAST] Sent to ALL connected users (${totalConnected} total)`);
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
        
        // Broadcast to room members (if they joined)
        io.to(roomId).emit('comment_deleted', broadcastData);
        console.log(`📢 [BROADCAST] Sent to room "${roomId}" (${roomSize} members)`);
        
        // Also broadcast to all connected users as fallback
        io.emit('comment_deleted', broadcastData);
        console.log(`📡 [BROADCAST] Sent to ALL connected users (${totalConnected} total)`);
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

  return false;
}
