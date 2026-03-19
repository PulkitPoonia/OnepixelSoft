import fs from 'fs';
import path from 'path';
import { ObjectId, GridFSBucket } from 'mongodb';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, 'uploads', 'userfiles');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

// Create uploads directory if it doesn't exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/* ================= FILE MANAGER ROUTES ================= */
export async function handleFileManagerRoutes(req, res, db, user) {
  const method = req.method;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // GET /api/files - List all files
  if (pathname === '/api/files' && method === 'GET') {
    return getFiles(req, res, db, user);
  }

  // GET /api/files/:fileId - Get file details
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}$/) && method === 'GET') {
    const fileId = pathname.split('/').pop();
    return getFileDetails(req, res, db, user, fileId);
  }

  // POST /api/files/upload - Upload file
  if (pathname === '/api/files/upload' && method === 'POST') {
    return uploadFile(req, res, db, user);
  }

  // DELETE /api/files/:fileId - Delete file
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}$/) && method === 'DELETE') {
    const fileId = pathname.split('/').pop();
    return deleteFile(req, res, db, user, fileId);
  }

  // PUT /api/files/:fileId/star - Star/unstar file
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}\/star$/) && method === 'PUT') {
    const fileId = pathname.split('/')[3];
    return toggleStarFile(req, res, db, user, fileId);
  }

  // PUT /api/files/:fileId/rename - Rename file
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}\/rename$/) && method === 'PUT') {
    const fileId = pathname.split('/')[3];
    return renameFile(req, res, db, user, fileId);
  }

  // PUT /api/files/:fileId/restore - Restore soft deleted file
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}\/restore$/) && method === 'PUT') {
    const fileId = pathname.split('/')[3].trim();
    console.log('🔄 [ROUTE] Restore route matched, fileId:', fileId);
    return restoreFile(req, res, db, user, fileId);
  }

  // PUT /api/files/:fileId/permanent-delete - Permanently delete file
  if (pathname.match(/^\/api\/files\/[a-f0-9]{24}\/permanent-delete$/) && method === 'PUT') {
    const fileId = pathname.split('/')[3];
    return permanentlyDeleteFile(req, res, db, user, fileId);
  }

  // GET /api/files/category/:category - Get files by category
  if (pathname.match(/^\/api\/files\/category\/(images|videos|documents)$/) && method === 'GET') {
    const category = pathname.split('/').pop();
    return getFilesByCategory(req, res, db, user, category);
  }

  // GET /api/files/search - Search files
  if (pathname === '/api/files/search' && method === 'GET') {
    return searchFiles(req, res, db, user);
  }

  // GET /api/storage - Get storage info
  if (pathname === '/api/storage' && method === 'GET') {
    return getStorageInfo(req, res, db, user);
  }

  // POST /api/files/save-from-chat - Save file from chat to file manager
  if (pathname === '/api/files/save-from-chat' && method === 'POST') {
    saveChatFileToFileManager(req, res, db, user);
    return true;  // ✅ Return true to indicate route was handled (even though response will be sent asynchronously)
  }

  return null;
}

/* ================= LIST FILES ================= */
async function getFiles(req, res, db, user) {
  try {
    const filesCollection = db.collection('files');

    // Return ALL files including deleted ones (for trash view)
    const files = await filesCollection
      .find({ 
        owner: user.username
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log('📁 [GET ALL FILES]', {
      username: user.username,
      totalFiles: files.length,
      deletedFiles: files.filter(f => f.deletedAt).length,
      activeFiles: files.filter(f => !f.deletedAt).length,
      deletedFileDetails: files.filter(f => f.deletedAt).map(f => ({ id: f._id.toString(), name: f.originalName, deletedAt: f.deletedAt }))
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, files }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to get files' }));
  }
}

/* ================= GET FILE DETAILS ================= */
async function getFileDetails(req, res, db, user, fileId) {
  try {
    const filesCollection = db.collection('files');

    const file = await filesCollection.findOne({
      _id: new ObjectId(fileId),
      owner: user.username,
      deletedAt: null
    });

    if (!file) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, file }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to get file details' }));
  }
}

/* ================= UPLOAD FILE ================= */
async function uploadFile(req, res, db, user) {
  try {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { filename, fileData, fileSize, mimeType } = data;

        if (!filename || !fileData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing required fields' }));
        }

        // Check file size
        const buffer = Buffer.from(fileData, 'base64');
        const actualSize = buffer.length;
        
        if (actualSize > MAX_FILE_SIZE) {
          const sizeMB = (actualSize / (1024 * 1024)).toFixed(2);
          const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          res.writeHead(413, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ 
            error: `File too large (${sizeMB}MB). Maximum size is ${maxMB}MB.` 
          }));
        }

        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${filename}`;
        const filePath = path.join(UPLOADS_DIR, uniqueFilename);

        // Save file
        fs.writeFileSync(filePath, buffer);

        // Store metadata in database
        const filesCollection = db.collection('files');
        const fileDoc = {
          owner: user.username,
          filename: uniqueFilename,
          originalName: filename,
          size: fileSize || buffer.length,
          mimeType: mimeType || 'application/octet-stream',
          path: `/uploads/userfiles/${uniqueFilename}`,
          folderId: null,
          isStarred: false,
          createdAt: new Date(),
          deletedAt: null,
          sharedWith: []
        };

        const result = await filesCollection.insertOne(fileDoc);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          success: true, 
          file: { ...fileDoc, _id: result.insertedId }
        }));
      } catch (err) {
        console.error('[UPLOAD ERROR]', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to upload file' }));
        }
      }
    });
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Server error' }));
    }
  }
}

/* ================= DELETE FILE ================= */
async function deleteFile(req, res, db, user, fileId) {
  try {
    const filesCollection = db.collection('files');

    const file = await filesCollection.findOne({
      _id: new ObjectId(fileId),
      owner: user.username
    });

    if (!file) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    const deleteTime = new Date();
    console.log('🗑️ [DELETE FILE - SOFT DELETE]', {
      fileId: fileId,
      fileName: file.originalName,
      deletingAt: deleteTime,
      currentDeletedAt: file.deletedAt
    });

    // Soft delete - only mark as deleted, don't remove from filesystem
    const updateResult = await filesCollection.updateOne(
      { _id: new ObjectId(fileId) },
      { $set: { deletedAt: deleteTime } }
    );

    // Verify it was updated
    const updatedFile = await filesCollection.findOne({ _id: new ObjectId(fileId) });
    console.log('🗑️ [DELETE FILE - VERIFICATION]', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      fileNowDeleted: !!updatedFile.deletedAt,
      deletedAtValue: updatedFile.deletedAt
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'File deleted' }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to delete file' }));
  }
}

/* ================= RESTORE FILE ================= */
async function restoreFile(req, res, db, user, fileId) {
  try {
    const filesCollection = db.collection('files');

    console.log('\n🔄🔄🔄 [RESTORE FILE] 🔄🔄🔄');
    console.log('🔄 Input fileId:', fileId);
    
    let objectId;
    try {
      objectId = new ObjectId(fileId);
      console.log('🔄 ObjectId created:', objectId.toString());
    } catch (err) {
      console.error('🔄 ❌ Invalid ObjectId:', fileId, err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid file ID format' }));
    }

    // Check file exists
    const file = await filesCollection.findOne({ _id: objectId, owner: user.username });
    if (!file) {
      console.error('🔄 ❌ File not found:', fileId, 'owner:', user.username);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    console.log('🔄 ✓ File found:', file.originalName, 'deletedAt:', file.deletedAt);

    if (!file.deletedAt) {
      console.error('🔄 ❌ File not in trash - no deletedAt');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File is not in trash' }));
    }

    console.log('🔄 🔄 Performing update...');
    const updateResult = await filesCollection.updateOne(
      { _id: objectId },
      { $unset: { deletedAt: '' } }
    );
    console.log('🔄 Update result:', updateResult.modifiedCount, 'documents modified');

    // Verify update worked
    const verifyFile = await filesCollection.findOne({ _id: objectId });
    console.log('🔄 ✓ Post-update verification:', {
      filename: verifyFile.originalName,
      deletedAt: verifyFile.deletedAt,
      hasDeletedAt: 'deletedAt' in verifyFile
    });

    if (verifyFile.deletedAt) {
      console.error('🔄 ❌ FAILED: deletedAt still exists after update!');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Failed to remove deletedAt field' }));
    }

    console.log('🔄 ✅ SUCCESS!\n');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'File restored' }));
  } catch (err) {
    console.error('🔄 ❌ [RESTORE ERROR]', err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to restore file' }));
  }
}

/* ================= PERMANENTLY DELETE FILE ================= */
async function permanentlyDeleteFile(req, res, db, user, fileId) {
  try {
    const filesCollection = db.collection('files');

    const file = await filesCollection.findOne({
      _id: new ObjectId(fileId),
      owner: user.username
    });

    if (!file) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    // Delete from filesystem
    const filePath = path.join(__dirname, file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Permanently delete from database
    await filesCollection.deleteOne({
      _id: new ObjectId(fileId),
      owner: user.username
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, message: 'File permanently deleted' }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to permanently delete file' }));
  }
}

/* ================= TOGGLE STAR ================= */
async function toggleStarFile(req, res, db, user, fileId) {
  try {
    const filesCollection = db.collection('files');

    const file = await filesCollection.findOne({
      _id: new ObjectId(fileId),
      owner: user.username
    });

    if (!file) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    await filesCollection.updateOne(
      { _id: new ObjectId(fileId) },
      { $set: { isStarred: !file.isStarred } }
    );

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ 
      success: true, 
      isStarred: !file.isStarred 
    }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to toggle star' }));
  }
}

/* ================= RENAME FILE ================= */
async function renameFile(req, res, db, user, fileId) {
  try {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { newName } = JSON.parse(body);

        if (!newName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'New name is required' }));
        }

        const filesCollection = db.collection('files');
        const result = await filesCollection.updateOne(
          { 
            _id: new ObjectId(fileId),
            owner: user.username
          },
          { $set: { originalName: newName } }
        );

        if (result.matchedCount === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'File not found' }));
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ 
          success: true, 
          message: 'File renamed'
        }));
      } catch (err) {
        console.error('[RENAME ERROR]', err);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Failed to rename file' }));
        }
      }
    });
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Server error' }));
    }
  }
}

/* ================= GET FILES BY CATEGORY ================= */
async function getFilesByCategory(req, res, db, user, category) {
  try {
    const filesCollection = db.collection('files');

    const categoryMimeTypes = {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/mpeg'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    };

    const mimeTypes = categoryMimeTypes[category] || [];

    const files = await filesCollection
      .find({
        owner: user.username,
        deletedAt: null,
        mimeType: { $in: mimeTypes }
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, files }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to get files by category' }));
  }
}

/* ================= SEARCH FILES ================= */
async function searchFiles(req, res, db, user) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = url.searchParams.get('q') || '';

    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Search query is required' }));
    }

    const filesCollection = db.collection('files');
    const files = await filesCollection
      .find({
        owner: user.username,
        deletedAt: null,
        $or: [
          { originalName: { $regex: query, $options: 'i' } },
          { filename: { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, files }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to search files' }));
  }
}

/* ================= GET STORAGE INFO ================= */
async function getStorageInfo(req, res, db, user) {
  try {
    const filesCollection = db.collection('files');

    const files = await filesCollection
      .find({
        owner: user.username,
        deletedAt: null
      })
      .toArray();

    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    const maxStorage = 5 * 1024 * 1024 * 1024; // 5GB
    const usedPercentage = (totalSize / maxStorage) * 100;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      success: true,
      totalSize,
      maxStorage,
      usedPercentage: Math.min(usedPercentage, 100),
      fileCount: files.length
    }));
  } catch (err) {
    console.error('[FILE MANAGER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to get storage info' }));
  }
}

/* ================= SAVE CHAT FILE TO FILE MANAGER ================= */
async function saveChatFileToFileManager(req, res, db, user) {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      console.log('[SAVE FROM CHAT] Received request, raw body:', body);
      const { fileId, chatFileUrl, fileName } = JSON.parse(body);

      console.log('[SAVE FROM CHAT] Parsed request:', { fileId, chatFileUrl, fileName, owner: user?.username });

      if (!fileName) {
        console.error('[SAVE FROM CHAT] Missing fileName');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing fileName' }));
      }

      if (!fileId && !chatFileUrl) {
        console.error('[SAVE FROM CHAT] Missing fileId and chatFileUrl');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Missing fileId or chatFileUrl' }));
      }

      let fileBuffer;

      // Handle new fileId format (from GridFS database)
      if (fileId) {
        try {
          console.log('[SAVE FROM CHAT - DB FILE]', { fileId, fileName });
          const bucket = new GridFSBucket(db);
          const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));

          const chunks = [];
          await new Promise((resolve, reject) => {
            downloadStream.on('data', chunk => chunks.push(chunk));
            downloadStream.on('end', () => resolve());
            downloadStream.on('error', reject);
          });

          fileBuffer = Buffer.concat(chunks);
          console.log('[SAVE FROM CHAT - DOWNLOADED]', { fileId, size: fileBuffer.length });
        } catch (err) {
          console.error('[SAVE FROM CHAT - DB ERROR]', err);
          if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Chat file not found in database' }));
          }
          return;
        }
      } 
      // Handle legacy chatFileUrl format (filesystem)
      else if (chatFileUrl) {
        console.log('[SAVE FROM CHAT - LEGACY]', { chatFileUrl, fileName });
        const chatFilePath = path.join(__dirname, chatFileUrl);
        
        if (!fs.existsSync(chatFilePath)) {
          if (!res.headersSent) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Chat file not found' }));
          }
          return;
        }

        fileBuffer = fs.readFileSync(chatFilePath);
      }

      // Copy to file manager uploads directory
      const uniqueFilename = `${Date.now()}-${fileName}`;
      const fileManagerPath = path.join(UPLOADS_DIR, uniqueFilename);
      
      fs.writeFileSync(fileManagerPath, fileBuffer);

      // Get MIME type
      const mimeType = getMimeType(fileName);

      // Store metadata in database
      const filesCollection = db.collection('files');
      const fileDoc = {
        owner: user.username,
        filename: uniqueFilename,
        originalName: fileName,
        size: fileBuffer.length,
        mimeType: mimeType,
        path: `/uploads/userfiles/${uniqueFilename}`,
        folderId: null,
        isStarred: false,
        createdAt: new Date(),
        deletedAt: null,
        sharedWith: [],
        savedFromChat: true
      };

      const result = await filesCollection.insertOne(fileDoc);

      console.log('[SAVE FROM CHAT - SAVED]', { fileName, size: fileBuffer.length, path: fileDoc.path });

      if (!res.headersSent) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          file: { ...fileDoc, _id: result.insertedId }
        }));
      }
    } catch (err) {
      console.error('[SAVE FROM CHAT ERROR]', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to save file' }));
      }
    }
  });
}

/* ================= AUTO-CLEANUP: Empty bin after 30 days ================= */
export async function autoClearOldDeletedFiles(db) {
  try {
    const filesCollection = db.collection('files');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    console.log('🧹 [AUTO-CLEANUP] Starting... Looking for files deleted before:', thirtyDaysAgo);
    
    // Find all files that were deleted more than 30 days ago
    const filesToDelete = await filesCollection
      .find({
        deletedAt: { $exists: true, $ne: null, $lt: thirtyDaysAgo }
      })
      .toArray();
    
    if (filesToDelete.length === 0) {
      console.log('🧹 [AUTO-CLEANUP] No files to clean up. Bin is fresh!');
      return { success: true, deletedCount: 0 };
    }
    
    console.log(`🧹 [AUTO-CLEANUP] Found ${filesToDelete.length} files older than 30 days. Deleting...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Delete each file
    for (const file of filesToDelete) {
      try {
        // Delete from filesystem
        const filePath = path.join(__dirname, file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ [AUTO-CLEANUP] Deleted file from disk: ${file.originalName}`);
        }
        
        // Delete from database
        await filesCollection.deleteOne({ _id: file._id });
        successCount++;
        console.log(`✅ [AUTO-CLEANUP] Permanently deleted: ${file.originalName} (owner: ${file.owner})`);
      } catch (err) {
        errorCount++;
        console.error(`❌ [AUTO-CLEANUP] Error deleting ${file.originalName}:`, err.message);
      }
    }
    
    console.log(`🧹 [AUTO-CLEANUP] Completed! Success: ${successCount}, Errors: ${errorCount}`);
    return { success: true, deletedCount: successCount, errorCount: errorCount };
    
  } catch (err) {
    console.error('❌ [AUTO-CLEANUP] Fatal error:', err);
    return { success: false, error: err.message };
  }
}

/* ================= HELPER: Detect MIME type ================= */
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
