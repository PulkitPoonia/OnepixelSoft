import {
  CHANGE_VM,
  ADD_PROJECT,
  UPDATE_PROJECT,
  DELETE_PROJECT,
  FETCH_PROJECTS,
  ADD_TASK,
  UPDATE_TASK,
  DELETE_TASK,
  FETCH_TASKS,
  ADD_SUBTASK,
  UPDATE_SUBTASK,
  DELETE_SUBTASK,
  ADD_COMMENT,
  UPDATE_COMMENT,
  DELETE_COMMENT,
  ADD_ATTACHMENT,
  DELETE_ATTACHMENT,
  UPDATE_TASK_STATUS,
  UPDATE_TASK_ASSIGNED_MEMBERS,
  UPDATE_TASK_DEADLINE,
  TASK_PERMISSION_DENIED,
  ADD_PROJECT_ATTACHMENT,
  UPDATE_PROJECT_ATTACHMENT,
  DELETE_PROJECT_ATTACHMENT
} from "../constants/ToDo";
import { notifyTaskPermissionDenied } from "../../utils/taskPermissions";

// API Configuration
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const getToken = () => {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("adminToken")
  );
};

const getAuthHeaders = (isJson = false) => {
  const token = getToken();
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// Database API Functions
async function saveProjectToDatabase(project) {
  try {
    const headers = getAuthHeaders(true);
    console.log('📤 Saving project to database:', {project, headers});
    
    const res = await fetch(`${API_BASE}/api/tasks/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify(project)
    });
    
    console.log('📥 Project save response status:', res.status);
    const data = await res.json();
    console.log('📥 Project save response data:', data);
    
    if (!res.ok) {
      const error = data.error || `HTTP ${res.status}`;
      throw { status: res.status, message: error };
    }
    
    const savedProject = data.project || project;
    // Normalize MongoDB _id to id for frontend compatibility
    let projectId = savedProject._id;
    if (typeof projectId === 'object' && projectId.$oid) {
      projectId = projectId.$oid;
    } else if (projectId) {
      projectId = String(projectId);
    }
    
    const normalized = {
      ...savedProject,
      id: projectId,
      _id: projectId
    };
    console.log('✅ Normalized project:', normalized);
    return normalized;
  } catch (e) {
    console.error('❌ Failed to save project to database:', e);
    throw e;
  }
}

async function updateProjectInDatabase(projectId, updatedData) {
  try {
    const cleanProjectId = String(projectId).trim();
    console.log('📤 Updating project:', { projectId: cleanProjectId, data: updatedData });
    
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updatedData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('✅ Project updated successfully');
    return await res.json();
  } catch (e) {
    console.error('Failed to update project in database:', e);
    throw e;
  }
}

async function addUserToProjectInDatabase(projectId, userId) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanUserId = String(userId).trim();
    console.log('📤 Adding user to project:', { projectId: cleanProjectId, userId: cleanUserId });
    
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/assign-user`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ userId: cleanUserId })
    });
    
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (e) {
    console.error('Failed to add user to project:', e);
    throw e;
  }
}

async function removeUserFromProjectInDatabase(projectId, userId) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanUserId = String(userId).trim();
    console.log('📤 Removing user from project:', { projectId: cleanProjectId, userId: cleanUserId });
    
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/remove-user`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ userId: cleanUserId })
    });
    
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || `HTTP ${res.status}`);
      error.status = res.status;
      throw error;
    }
    return data;
  } catch (e) {
    console.error('Failed to remove user from project:', e);
    throw e;
  }
}

async function deleteProjectFromDatabase(projectId) {
  try {
    // Clean up projectId - remove any extra characters
    const cleanId = String(projectId).trim();
    console.log('📤 Deleting project:', { original: projectId, clean: cleanId });
    
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    
    console.log('📥 Delete response status:', res.status);
    const data = await res.json();
    console.log('📥 Delete response data:', data);
    
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
      error.status = res.status;
      error.message = data.error || `HTTP ${res.status}`;
      throw error;
    }
    console.log('✅ Project deleted successfully');
  } catch (e) {
    console.error('❌ Failed to delete project from database:', e);
    throw e;
  }
}

async function saveTaskToDatabase(projectId, task) {
  try {
    const cleanProjectId = String(projectId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(task)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const savedTask = data.task || task;
    let taskId = savedTask._id;
    if (typeof taskId === 'object' && taskId.$oid) {
      taskId = taskId.$oid;
    } else if (taskId) {
      taskId = String(taskId);
    }
    return {
      ...savedTask,
      id: taskId,
      _id: taskId
    };
  } catch (e) {
    console.error('Failed to save task to database:', e);
    return task;
  }
}

async function updateTaskInDatabase(projectId, taskId, updatedData) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanTaskId = String(taskId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks/${cleanTaskId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updatedData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Failed to update task in database:', e);
    throw e;
  }
}

async function deleteTaskFromDatabase(projectId, taskId) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanTaskId = String(taskId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks/${cleanTaskId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('Failed to delete task from database:', e);
    throw e;
  }
}

async function uploadProjectAttachmentToDatabase(projectId, fileData) {
  try {
    const cleanProjectId = String(projectId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/attachments`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(fileData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // Normalize the newly uploaded attachment for the frontend
    const normAttachment = {
      ...data.attachment,
      id: data.attachment._id,
      name: data.attachment.filename,
      size: data.attachment.fileSize,
      url: `/uploads/project-files/${data.attachment.diskFilename}`,
      downloadUrl: `/api/tasks/projects/${cleanProjectId}/attachments/${data.attachment._id}/download`
    };
    return normAttachment;
  } catch (e) {
    console.error('Failed to upload project attachment to database:', e);
    throw e;
  }
}

async function updateProjectAttachmentInDatabase(projectId, attachmentId, fileData) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanAttachmentId = String(attachmentId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/attachments/${cleanAttachmentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(fileData)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.attachment;
  } catch (e) {
    console.error('Failed to update project attachment in database:', e);
    throw e;
  }
}

async function deleteProjectAttachmentFromDatabase(projectId, attachmentId) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanAttachmentId = String(attachmentId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/attachments/${cleanAttachmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('Failed to delete project attachment from database:', e);
    throw e;
  }
}

async function fetchProjectsFromDatabase() {
  try {
    const headers = getAuthHeaders();
    console.log('📤 Fetching projects from database with headers:', headers);
    
    const res = await fetch(`${API_BASE}/api/tasks/projects`, {
      headers
    });
    
    console.log('📥 Fetch projects response status:', res.status);
    const data = await res.json();
    console.log('📥 Fetch projects response data:', data);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(data)}`);
    
    // Normalize MongoDB _id to id for frontend compatibility
    const projects = (data.projects || []).map(project => {
      // Extract the proper ID from MongoDB ObjectId
      let projectId = project._id?.$oid || project._id?.toString();
      if (typeof projectId === 'object' && projectId.$oid) {
        projectId = projectId.$oid; // Handle extended JSON format
      } else if (projectId) {
        projectId = String(projectId); // Convert to string
      }
      
      return {
        ...project,
        id: projectId,
        _id: projectId, // Keep both for compatibility
        assignedUsers: Array.isArray(project.assignedUsers) ? project.assignedUsers : [],
        attachments: (project.attachments || []).map(attachment => {
          let attachmentId = attachment._id?.$oid || attachment._id?.toString() || attachment.id;
          // Fallback to diskFilename if no valid ID found (shouldn't happen, but defensive)
          if (!attachmentId || attachmentId === 'undefined') {
            attachmentId = attachment.diskFilename || `attachment-${Math.random().toString(36).substr(2, 9)}`;
          }
          return {
            ...attachment,
            id: attachmentId,
            _id: attachmentId,
            name: attachment.filename,
            size: attachment.fileSize,
            url: `/uploads/project-files/${attachment.diskFilename}`,
            downloadUrl: `/api/tasks/projects/${projectId}/attachments/${attachmentId}/download`
          };
        }),
        tasks: (project.tasks || []).map(task => {
         let taskId = task._id?.$oid || task._id?.toString();
          return {
            ...task,
            id: taskId,
            _id: taskId
          };
        })
      };
    });
    
    console.log('✅ Fetched and normalized projects:', projects);
    return projects;
  } catch (e) {
    console.error('❌ Failed to fetch projects from database:', e);
    return [];
  }
}

// Admin Permission Check
function isUserAdmin() {
  try {
    // Check if user has admin token
    return !!localStorage.getItem('adminToken');
  } catch (e) {
    return false;
  }
}

// View Mode
export function ganttViewMode(vm) {
  return {
    type: CHANGE_VM,
    vm,
  }
}

// Permission Denied Action
export function taskPermissionDenied(action) {
  notifyTaskPermissionDenied(action);
  return {
    type: TASK_PERMISSION_DENIED,
    payload: `Only admins can ${action}. You don't have permission to perform this action.`,
  };
}

// Project Actions
export function addProject(project) {
  return async (dispatch) => {
    console.log('📌 [ACTION] addProject called with:', project);
    try {
      const savedProject = await saveProjectToDatabase(project);
      console.log('📌 [ACTION] dispatching ADD_PROJECT with:', savedProject);
      dispatch({
        type: ADD_PROJECT,
        payload: savedProject,
      });
    } catch (error) {
      console.error('❌ Error adding project:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to create project'
        });
      }
    }
  };
}
export function addUserToProject(projectId, userId) {
  return async (dispatch) => {
    console.log('📋 [ACTION] addUserToProject called with:', { projectId, userId });
    try {
      await addUserToProjectInDatabase(projectId, userId);
      console.log('📋 [ACTION] dispatching ADD_USER_TO_PROJECT');
      dispatch({
        type: 'ADD_USER_TO_PROJECT',
        payload: { projectId, userId },
      });
    } catch (error) {
      console.error('❌ Error adding user to project:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: 'You do not have permission to assign users to this project'
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to assign user to project'
        });
      }
    }
  };
}

export function removeUserFromProject(projectId, userId) {
  return async (dispatch) => {
    console.log('📋 [ACTION] removeUserFromProject called with:', { projectId, userId });
    try {
      await removeUserFromProjectInDatabase(projectId, userId);
      console.log('📋 [ACTION] dispatching REMOVE_USER_FROM_PROJECT');
      dispatch({
        type: 'REMOVE_USER_FROM_PROJECT',
        payload: { projectId, userId },
      });
    } catch (error) {
      console.error('❌ Error removing user from project:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: 'You do not have permission to remove users from this project'
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to remove user from project'
        });
      }
    }
  };
}

export function assignProjectToUser(projectId, userId) {
  // Allow both admins and the current user to assign users to projects
  // (permission check will be done on backend for non-admins)
  return async (dispatch) => {
    console.log('📋 [ACTION] assignProjectToUser called with:', { projectId, userId });
    try {
      await addUserToProjectInDatabase(projectId, userId);
      console.log('📋 [ACTION] dispatching UPDATE_PROJECT with assignment');
      dispatch({
        type: UPDATE_PROJECT,
        payload: { projectId, updatedData: { $addToSet: { assignedUsers: userId } } },
      });
    } catch (error) {
      console.error('❌ Error assigning user to project:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: 'You do not have permission to assign users to this project'
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to assign user to project'
        });
      }
    }
  };
}

export function removeProjectAssignment(projectId) {
  // Allow both admins and the current user to remove assignments
  // (permission check will be done on backend for non-admins)
  return async (dispatch) => {
    console.log('📋 [ACTION] removeProjectAssignment called with:', projectId);
    try {
      await updateProjectInDatabase(projectId, { assignedUsers: [] });
      console.log('📋 [ACTION] dispatching UPDATE_PROJECT to remove all assignments');
      dispatch({
        type: UPDATE_PROJECT,
        payload: { projectId, updatedData: { assignedUsers: [] } },
      });
    } catch (error) {
      console.error('❌ Error removing project assignments:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: 'You do not have permission to remove assignments from this project'
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to remove assignments'
        });
      }
    }
  };
}

export function updateProject(projectId, updatedData) {
  return async (dispatch) => {
    await updateProjectInDatabase(projectId, updatedData);
    dispatch({
      type: UPDATE_PROJECT,
      payload: { projectId, updatedData },
    });
  };
}

export function deleteProject(projectId) {
  return async (dispatch) => {
    console.log('📌 [ACTION] deleteProject called with:', projectId);
    try {
      await deleteProjectFromDatabase(projectId);
      console.log('📌 [ACTION] dispatching DELETE_PROJECT with:', projectId);
      dispatch({
        type: DELETE_PROJECT,
        payload: projectId,
      });
    } catch (error) {
      console.error('❌ Error deleting project:', error);
      if (error.status === 403) {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: 'You do not have permission to delete this project'
        });
      } else {
        dispatch({
          type: TASK_PERMISSION_DENIED,
          payload: error.message || 'Failed to delete project'
        });
      }
    }
  };
}

export function fetchProjects(projects) {
  return async (dispatch) => {
    const dbProjects = await fetchProjectsFromDatabase();
    dispatch({
      type: FETCH_PROJECTS,
      payload: dbProjects.length > 0 ? dbProjects : projects,
    });
  };
}

export function loadProjectsFromDatabase() {
  return async (dispatch) => {
    console.log('📌 [ACTION] loadProjectsFromDatabase called');
    const projects = await fetchProjectsFromDatabase();
    console.log('📌 [ACTION] dispatching FETCH_PROJECTS with:', projects);
    dispatch({
      type: FETCH_PROJECTS,
      payload: projects,
    });
  };
}

// Task Actions
export function addTask(projectId, task) {
  // Only admins can create tasks
  if (!isUserAdmin()) {
    return taskPermissionDenied('create tasks');
  }
  
  return async (dispatch) => {
    const savedTask = await saveTaskToDatabase(projectId, task);
    dispatch({
      type: ADD_TASK,
      payload: { projectId, task: savedTask },
    });
  };
}

export function updateTask(projectId, taskId, updatedData) {
  return async (dispatch) => {
    await updateTaskInDatabase(projectId, taskId, updatedData);
    dispatch({
      type: UPDATE_TASK,
      payload: { projectId, taskId, updatedData },
    });
  };
}

export function deleteTask(projectId, taskId) {
  return async (dispatch) => {
    await deleteTaskFromDatabase(projectId, taskId);
    dispatch({
      type: DELETE_TASK,
      payload: { projectId, taskId },
    });
  };
}

export function fetchTasks(projectId, tasks) {
  return {
    type: FETCH_TASKS,
    payload: { projectId, tasks },
  };
}

// Subtask Actions
export function addSubtask(projectId, taskId, subtask) {
  return {
    type: ADD_SUBTASK,
    payload: { projectId, taskId, subtask },
  };
}

export function updateSubtask(projectId, taskId, subtaskId, updatedData) {
  return {
    type: UPDATE_SUBTASK,
    payload: { projectId, taskId, subtaskId, updatedData },
  };
}

export function deleteSubtask(projectId, taskId, subtaskId) {
  return {
    type: DELETE_SUBTASK,
    payload: { projectId, taskId, subtaskId },
  };
}

// Comment Actions
async function addCommentToDatabase(projectId, taskId, text) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanTaskId = String(taskId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks/${cleanTaskId}/comments`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.comment;
  } catch (e) {
    console.error('Failed to add comment to database:', e);
    throw e;
  }
}

async function updateCommentInDatabase(projectId, taskId, commentId, text) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanTaskId = String(taskId).trim();
    const cleanCommentId = String(commentId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks/${cleanTaskId}/comments/${cleanCommentId}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ text })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Failed to update comment in database:', e);
    throw e;
  }
}

async function deleteCommentFromDatabase(projectId, taskId, commentId) {
  try {
    const cleanProjectId = String(projectId).trim();
    const cleanTaskId = String(taskId).trim();
    const cleanCommentId = String(commentId).trim();
    const res = await fetch(`${API_BASE}/api/tasks/projects/${cleanProjectId}/tasks/${cleanTaskId}/comments/${cleanCommentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error('Failed to delete comment from database:', e);
    throw e;
  }
}

export function addComment(projectId, taskId, text) {
  return async (dispatch) => {
    const comment = await addCommentToDatabase(projectId, taskId, text);
    dispatch({
      type: ADD_COMMENT,
      payload: { projectId, taskId, comment },
    });
  };
}

export function updateComment(projectId, taskId, commentId, text) {
  return async (dispatch) => {
    await updateCommentInDatabase(projectId, taskId, commentId, text);
    dispatch({
      type: UPDATE_COMMENT,
      payload: { projectId, taskId, commentId, text },
    });
  };
}

export function deleteComment(projectId, taskId, commentId) {
  return async (dispatch) => {
    await deleteCommentFromDatabase(projectId, taskId, commentId);
    dispatch({
      type: DELETE_COMMENT,
      payload: { projectId, taskId, commentId },
    });
  };
}

// Attachment Actions
export function addAttachment(projectId, taskId, attachment) {
  return {
    type: ADD_ATTACHMENT,
    payload: { projectId, taskId, attachment },
  };
}

export function deleteAttachment(projectId, taskId, attachmentId) {
  return {
    type: DELETE_ATTACHMENT,
    payload: { projectId, taskId, attachmentId },
  };
}

// Task Status and Details Actions
export function updateTaskStatus(projectId, taskId, status) {
  return async (dispatch) => {
    try {
      await updateTaskInDatabase(projectId, taskId, { status });
      dispatch({
        type: UPDATE_TASK_STATUS,
        payload: { projectId, taskId, status },
      });
    } catch (e) {
      console.error('Failed to update task status in database:', e);
      // Fallback: Dispatch anyway for UI responsiveness, even if it might revert on reload
      dispatch({
        type: UPDATE_TASK_STATUS,
        payload: { projectId, taskId, status },
      });
    }
  };
}

export function updateTaskAssignedMembers(projectId, taskId, members) {
  // Only admins can assign members to tasks
  if (!isUserAdmin()) {
    return taskPermissionDenied('assign members to tasks');
  }
  
  return async (dispatch) => {
    await updateTaskInDatabase(projectId, taskId, { assignedMembers: members });
    dispatch({
      type: UPDATE_TASK_ASSIGNED_MEMBERS,
      payload: { projectId, taskId, members },
    });
  };
}

export function updateTaskDeadline(projectId, taskId, deadline) {
  return {
    type: UPDATE_TASK_DEADLINE,
    payload: { projectId, taskId, deadline },
  };
}

// Project Attachment Actions
export function addProjectAttachment(projectId, fileData) {
  return async (dispatch) => {
    try {
      const attachment = await uploadProjectAttachmentToDatabase(projectId, fileData);
      dispatch({
        type: ADD_PROJECT_ATTACHMENT,
        payload: { projectId, attachment },
      });
      return attachment;
    } catch (e) {
      console.error('Failed to add project attachment:', e);
      throw e;
    }
  };
}

export function updateProjectAttachment(projectId, attachmentId, fileData) {
  return async (dispatch) => {
    try {
      const attachment = await updateProjectAttachmentInDatabase(projectId, attachmentId, fileData);
      dispatch({
        type: UPDATE_PROJECT_ATTACHMENT,
        payload: { projectId, attachment },
      });
      return attachment;
    } catch (e) {
      console.error('Failed to update project attachment:', e);
      throw e;
    }
  };
}

export function deleteProjectAttachment(projectId, attachmentId) {
  return async (dispatch) => {
    try {
      await deleteProjectAttachmentFromDatabase(projectId, attachmentId);
      dispatch({
        type: DELETE_PROJECT_ATTACHMENT,
        payload: { projectId, attachmentId },
      });
    } catch (e) {
      console.error('Failed to delete project attachment:', e);
      throw e;
    }
  };
}