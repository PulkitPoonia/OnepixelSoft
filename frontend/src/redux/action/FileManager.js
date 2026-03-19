import {
  LOAD_FILES,
  SET_CURRENT_FILE,
  UPLOAD_FILE,
  DELETE_FILE,
  RESTORE_FILE,
  TOGGLE_STAR_FILE,
  RENAME_FILE,
  FILTER_FILES,
  LOAD_STORAGE_INFO,
  SET_LOADING,
  SET_ERROR
} from '../constants/FileManager';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Load all files
export const loadFiles = () => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    console.log('🔄 loadFiles action: token exists?', !!token, 'BASE_URL:', BASE_URL);
    
    const response = await fetch(`${BASE_URL}/api/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('📡 loadFiles response status:', response.status);
    
    const data = await response.json();
    
    console.log('📦 loadFiles response data:', data);
    
    if (data.success) {
      dispatch({
        type: LOAD_FILES,
        payload: data.files
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
  } catch (err) {
    console.error('❌ loadFiles error:', err);
    dispatch({ type: SET_ERROR, payload: err.message });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

// Get single file details
export const getFileDetails = (fileId) => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: SET_CURRENT_FILE,
        payload: data.file
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
  }
};

// Upload file
export const uploadFile = (fileData) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(fileData)
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: UPLOAD_FILE,
        payload: data.file
      });
      return { success: true, file: data.file };
    } else {
      // Handle file size errors specifically
      if (response.status === 413 || data.error?.includes('too large')) {
        const errorMsg = data.error || 'File is too large. Maximum size is 10MB.';
        dispatch({ type: SET_ERROR, payload: errorMsg });
        alert(errorMsg);
        return { success: false, error: errorMsg };
      }
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

// Delete file
export const deleteFile = (fileId) => async (dispatch) => {
  try {
    console.log('🗑️ [deleteFile Action] Deleting file:', fileId);
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('🗑️ [deleteFile Action] Response:', { status: response.status, ok: response.ok, data });
    
    if (data.success && response.ok) {
      console.log('🗑️ [deleteFile Action] Dispatching DELETE_FILE for:', fileId);
      dispatch({
        type: DELETE_FILE,
        payload: fileId
      });
      return { success: true };
    } else {
      console.error('🗑️ [deleteFile Action] Error from server:', data.error);
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    console.error('🗑️ [deleteFile Action] Network error:', err);
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  }
};

// Restore soft deleted file
export const restoreFile = (fileId) => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');

    console.log('🔄 [RESTORE] Calling restore API for:', fileId);

    const response = await fetch(`${BASE_URL}/api/files/${fileId}/restore`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('🔄 [RESTORE] Backend response:', data);

    if (data.success) {

      // 🔥 UPDATE REDUX STATE
      dispatch({
        type: RESTORE_FILE,
        payload: fileId
      });

      // 🔥 Reload trash list
      await dispatch(getTrashedFiles());

      return { success: true };

    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false };
    }

  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false };
  }
};

// Permanently delete file
export const permanentlyDeleteFile = (fileId) => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}/permanent-delete`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: DELETE_FILE,
        payload: fileId
      });
      return { success: true };
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  }
};

// Toggle star
export const toggleStar = (fileId) => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}/star`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: TOGGLE_STAR_FILE,
        payload: { fileId, isStarred: data.isStarred }
      });
      return { success: true, isStarred: data.isStarred };
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  }
};

// Rename file
export const renameFile = (fileId, newName) => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/${fileId}/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newName })
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: RENAME_FILE,
        payload: { fileId, newName }
      });
      return { success: true };
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  }
};

// Get files by category
export const getFilesByCategory = (category) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/category/${category}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: FILTER_FILES,
        payload: { category, files: data.files }
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

// Search files
export const searchFiles = (query) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: LOAD_FILES,
        payload: data.files
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

// Get storage info
export const getStorageInfo = () => async (dispatch) => {
  try {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/storage`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({
        type: LOAD_STORAGE_INFO,
        payload: data
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
  }
};

// Save file from chat to file manager
export const saveChatFileToFileManager = (chatFileUrl, fileName) => async (dispatch) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    const response = await fetch(`${BASE_URL}/api/files/save-from-chat`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ chatFileUrl, fileName })
    });

    const data = await response.json();
    
    if (data.success) {
      dispatch({ type: UPLOAD_FILE, payload: data.file });
      return { success: true, file: data.file };
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
      return { success: false, error: data.error };
    }
  } catch (err) {
    dispatch({ type: SET_ERROR, payload: err.message });
    return { success: false, error: err.message };
  } finally {
    dispatch({ type: SET_LOADING, payload: false });
  }
};

// Auto-save files from chat messages (silent, no UI feedback)
export const autoSaveChatFiles = (message) => async (dispatch, getState) => {
  try {
    console.log('📥 [AUTO-SAVE] Message received:', {
      text: message?.text,
      sender: message?.senderId,
      senderName: message?.senderName
    });

    // Skip if message has no text
    if (!message?.text) {
      console.log('📥 Auto-save skipped: no message text');
      return;
    }

    console.log('📥 [AUTO-SAVE] Full message object:', JSON.stringify(message, null, 2));

    // Try to parse message text as JSON (for embedded file data)
    let fileData = null;
    try {
      console.log('📥 [AUTO-SAVE] message.text type:', typeof message.text);
      console.log('📥 [AUTO-SAVE] message.text value:', message.text);
      fileData = JSON.parse(message.text);
      console.log('📥 [AUTO-SAVE] Parsed message text successfully:', fileData);
    } catch (e) {
      // Not JSON, skip
      console.log('📥 Auto-save skipped: message text not JSON', { error: e.message, text: message.text?.slice?.(0, 100) });
      return;
    }

    // Skip if no file data (must have either fileId or fileUrl)
    if (!(fileData?.fileId || fileData?.fileUrl) || !fileData?.fileName) {
      console.log('📥 Auto-save skipped: no fileId/fileUrl or fileName', { 
        hasFileId: !!fileData?.fileId, 
        hasFileUrl: !!fileData?.fileUrl, 
        hasFileName: !!fileData?.fileName,
        fileData: fileData
      });
      return;
    }

    // Skip audio files
    const audioExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a'];
    const fileExt = fileData.fileName.toLowerCase().slice(fileData.fileName.lastIndexOf('.'));
    console.log('📥 File extension check:', { fileName: fileData.fileName, ext: fileExt, isAudio: audioExtensions.includes(fileExt) });
    
    if (audioExtensions.includes(fileExt)) {
      console.log('📥 Auto-save skipped: audio file');
      return; // Don't save audio files
    }

    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    if (!token) {
      console.log('📥 Auto-save skipped: no token');
      return;
    }

    // Handle both new fileId (from GridFS) and legacy fileUrl formats
    let saveData = {};
    
    if (fileData.fileId) {
      // New database format - download from GridFS then save
      console.log('📥 Auto-saving database file:', fileData.fileName, fileData.fileId);
      saveData = { 
        fileId: fileData.fileId,
        fileName: fileData.fileName 
      };
    } else if (fileData.fileUrl) {
      // Legacy filesystem format
      console.log('📥 Auto-saving legacy file:', fileData.fileName, fileData.fileUrl);
      saveData = { 
        chatFileUrl: fileData.fileUrl, 
        fileName: fileData.fileName 
      };
    }

    console.log('📥 Sending auto-save request to:', `${BASE_URL}/api/files/save-from-chat`);
    console.log('📥 With data:', saveData);

    // Silent auto-save without loading state
    const response = await fetch(`${BASE_URL}/api/files/save-from-chat`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });

    console.log('📥 [AUTO-SAVE] Fetch response status:', response.status, response.statusText);
    console.log('📥 [AUTO-SAVE] Response headers:', {
      'content-type': response.headers.get('content-type')
    });
    
    const data = await response.json();
    
    console.log('📥 [AUTO-SAVE] Response data:', data);
    
    if (data.success) {
      // Silently update Redux without showing UI
      dispatch({ type: UPLOAD_FILE, payload: data.file });
      console.log('✅ Auto-saved chat file to file manager:', fileData.fileName);
    } else {
      console.warn('⚠️ Failed to auto-save chat file:', fileData.fileName, 'Error:', data.error || 'No error message', 'Response:', data);
    }
  } catch (err) {
    // Silent fail - don't disrupt user experience
    console.error('❌ Auto-save error:', err.message);
  }
};

// Filter starred files
export const getStarredFiles = () => async (dispatch, getState) => {
  try {
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    // Always fetch fresh data from server
    const response = await fetch(`${BASE_URL}/api/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    
    if (data.success) {
      const files = data.files;
      dispatch({
        type: LOAD_FILES,
        payload: data.files
      });
      
      const starredFiles = files.filter(file => file.isStarred);
      
      dispatch({
        type: FILTER_FILES,
        payload: { category: 'starred', files: starredFiles }
      });
    } else {
      dispatch({ type: SET_ERROR, payload: data.error });
    }
    
    dispatch({ type: SET_LOADING, payload: false });
  } catch (err) {
    console.error('Error loading starred files:', err);
    dispatch({ type: SET_ERROR, payload: err.message });
  }
};

// Filter deleted/trash files
export const getTrashedFiles = () => async (dispatch, getState) => {
  try {
    console.log('🗑️ [getTrashedFiles] Starting...');
    dispatch({ type: SET_LOADING, payload: true });
    const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
    
    // Always fetch fresh data from server (don't use cache)
    const response = await fetch(`${BASE_URL}/api/files?bust=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    console.log('🗑️ [getTrashedFiles] Server response:', { success: data.success, totalFiles: data.files?.length });
    
    if (data.success) {
      const files = data.files;
     const trashedFiles = files.filter(file => file.deletedAt);
      
      console.log('🗑️ [getTrashedFiles] Filtering:', {
        totalFiles: files.length,
        trashedFiles: trashedFiles.length,
        trashedFileIds: trashedFiles.map(f => ({ id: f._id, name: f.originalName, deletedAt: f.deletedAt }))
      });
      
      // First update all files in state
      dispatch({
        type: LOAD_FILES,
        payload: data.files
      });
      
      // Then filter for trash view
      dispatch({
        type: FILTER_FILES,
        payload: { category: 'trash', files: trashedFiles }
      });
      
      console.log('🗑️ [getTrashedFiles] Dispatched with', trashedFiles.length, 'deleted files');
      dispatch({ type: SET_LOADING, payload: false });
      return { success: true, trashedFiles };
    } else {
      console.error('🗑️ [getTrashedFiles] Server error:', data.error);
      dispatch({ type: SET_ERROR, payload: data.error });
      dispatch({ type: SET_LOADING, payload: false });
      return { success: false, error: data.error };
    }
  } catch (err) {
    console.error('🗑️ [getTrashedFiles] Fetch error:', err);
    dispatch({ type: SET_ERROR, payload: err.message });
    dispatch({ type: SET_LOADING, payload: false });
    return { success: false, error: err.message };
  }
};

// Filter shared files
export const getSharedFiles = () => (dispatch, getState) => {
  const state = getState();
  const files = state.fileManagerReducer?.files || [];
  const sharedFiles = files.filter(file => file.sharedWith && file.sharedWith.length > 0);
  
  dispatch({
    type: FILTER_FILES,
    payload: { category: 'shared', files: sharedFiles }
  });
};
