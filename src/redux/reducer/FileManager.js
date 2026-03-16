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
  SET_ERROR,
  CLEAR_ERROR
} from '../constants/FileManager';

const initialState = {
  files: [],
  currentFile: null,
  currentCategory: null,
  filteredFiles: [],
  storageInfo: {
    totalSize: 0,
    maxStorage: 5 * 1024 * 1024 * 1024, // 5GB
    usedPercentage: 0,
    fileCount: 0
  },
  loading: false,
  error: null
};

const FileManagerReducer = (state = initialState, action) => {
  switch (action.type) {
    case LOAD_FILES:
      console.log('📁 [LOAD_FILES] Reducer received:', { 
        totalFiles: action.payload?.length,
        deletedFiles: action.payload?.filter(f => f.deletedAt).length,
        activeFiles: action.payload?.filter(f => !f.deletedAt).length,
        currentCategoryBeforeLoad: state.currentCategory
      });
      
      // Keep currentCategory if it's already set (like 'trash'), otherwise clear it
      const shouldKeepCategory = state.currentCategory !== null;
      
      const newState = {
        ...state,
        files: [...action.payload], // Create new array reference
        filteredFiles: [...action.payload], // Reset filteredFiles too
        currentCategory: shouldKeepCategory ? state.currentCategory : null,
        error: null
      };
      
      console.log('📁 [LOAD_FILES] State updated:', {
        totalFiles: newState.files.length,
        filteredFilesLength: newState.filteredFiles.length,
        currentCategory: newState.currentCategory
      });
      
      return newState;

    case SET_CURRENT_FILE:
      return {
        ...state,
        currentFile: action.payload,
        error: null
      };

    case UPLOAD_FILE:
      return {
        ...state,
        files: [action.payload, ...state.files],
        filteredFiles: [action.payload, ...state.filteredFiles],
        error: null
      };

    case DELETE_FILE:
      // Soft delete - mark file as deleted instead of removing it
      console.log('🗑️ [DELETE_FILE] Reducer marking file as deleted:', action.payload);
      const deletedFiles = state.files.map(f =>
        f._id === action.payload ? { ...f, deletedAt: new Date().toISOString() } : f
      );
      const deletedFilteredFiles = state.filteredFiles.map(f =>
        f._id === action.payload ? { ...f, deletedAt: new Date().toISOString() } : f
      );
      return {
        ...state,
        files: deletedFiles,
        filteredFiles: deletedFilteredFiles,
        currentFile: state.currentFile?._id === action.payload ? null : state.currentFile,
        error: null
      };

  case RESTORE_FILE:
  return {
    ...state,
    files: state.files.map(file =>
      String(file._id) === String(action.payload)
        ? { ...file, deletedAt: null }
        : file
    ),
    filteredFiles: state.filteredFiles.filter(
      file => String(file._id) !== String(action.payload)
    )
  };
      
      const newFilteredFiles = state.filteredFiles.filter(f => {
        const match = String(f._id) === String(action.payload);
        if (match) console.log('🔄 ✓ REMOVED:', f.originalName);
        return !match;
      });
      
      console.log('🔄 filteredFiles.length AFTER:', newFilteredFiles.length);
      console.log('🔄 ✅ RESTORE_FILE REDUCER COMPLETE\n');
      
      return {
        ...state,
        filteredFiles: newFilteredFiles
      };

    case TOGGLE_STAR_FILE:
      const { fileId, isStarred } = action.payload;
      const updatedFiles = state.files.map(f =>
        f._id === fileId ? { ...f, isStarred } : f
      );
      const updatedFiltered = state.filteredFiles.map(f =>
        f._id === fileId ? { ...f, isStarred } : f
      );
      return {
        ...state,
        files: updatedFiles,
        filteredFiles: updatedFiltered,
        currentFile: state.currentFile?._id === fileId 
          ? { ...state.currentFile, isStarred }
          : state.currentFile,
        error: null
      };

    case RENAME_FILE:
      const { fileId: renameFileId, newName } = action.payload;
      const renamedFiles = state.files.map(f =>
        f._id === renameFileId ? { ...f, originalName: newName } : f
      );
      const renamedFiltered = state.filteredFiles.map(f =>
        f._id === renameFileId ? { ...f, originalName: newName } : f
      );
      return {
        ...state,
        files: renamedFiles,
        filteredFiles: renamedFiltered,
        currentFile: state.currentFile?._id === renameFileId 
          ? { ...state.currentFile, originalName: newName }
          : state.currentFile,
        error: null
      };

    case FILTER_FILES:
      console.log('🔍 [FILTER_FILES] Reducer received:', { 
        category: action.payload.category, 
        filesCount: action.payload.files?.length,
        fileDetails: action.payload.files?.map(f => ({ name: f.originalName, deletedAt: f.deletedAt }))
      });
      
      // Important: Create a completely new filteredFiles array with only the filtered results
      const filteredResult = {
        ...state,
        filteredFiles: [...action.payload.files], // Create new array reference
        currentCategory: action.payload.category,
        error: null
      };
      
      console.log('🔍 [FILTER_FILES] Updated filteredFiles:', {
        newCount: filteredResult.filteredFiles.length,
        category: filteredResult.currentCategory
      });
      
      return filteredResult;

    case LOAD_STORAGE_INFO:
      return {
        ...state,
        storageInfo: action.payload,
        error: null
      };

    case SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    default:
      return state;
  }
};

export default FileManagerReducer;
