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
  ADD_PROJECT_ATTACHMENT,
  UPDATE_PROJECT_ATTACHMENT,
  DELETE_PROJECT_ATTACHMENT,
  UPDATE_TASK_STATUS,
  UPDATE_TASK_ASSIGNED_MEMBERS,
  UPDATE_TASK_DEADLINE,
  TASK_PERMISSION_DENIED
} from "../constants/ToDo";

const initialState = {
  vm: "Week",
  projects: [],
  permissionError: null,
};

const ToDoReducer = (state = initialState, action) => {
  console.log('🗂️ [REDUCER] Action received:', action.type, 'Payload:', action.payload, 'Current projects:', state.projects.length);
  
  switch (action.type) {
    // View Mode
    case CHANGE_VM:
      return {
        ...state,
        vm: action.vm,
      };

    // Project Actions
    case FETCH_PROJECTS:
      console.log('📥 [REDUCER] FETCH_PROJECTS - Setting projects:', action.payload);
      return {
        ...state,
        projects: action.payload,
      };

    case ADD_PROJECT: {
      const newProject = {
        ...action.payload,
        // Use the id from database response if available, otherwise generate one
        id: action.payload.id || Date.now().toString(),
        tasks: action.payload.tasks || [],
        createdAt: action.payload.createdAt || new Date().toISOString(),
      };
      console.log('➕ [REDUCER] ADD_PROJECT - Adding project:', newProject);
      return {
        ...state,
        projects: [...state.projects, newProject],
      };
    }

    case UPDATE_PROJECT: {
      const { projectId, updatedData } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, ...updatedData } : project
        ),
      };
    }

    case DELETE_PROJECT:
      console.log('🗑️ [REDUCER] DELETE_PROJECT - Deleting project:', action.payload);
      return {
        ...state,
        projects: state.projects.filter((project) => project.id !== action.payload),
      };

    case ADD_PROJECT_ATTACHMENT: {
      const { projectId, attachment } = action.payload;
      return {
        ...state,
        projects: state.projects.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              attachments: [...(project.attachments || []), attachment]
            };
          }
          return project;
        })
      };
    }

    case UPDATE_PROJECT_ATTACHMENT: {
      const { projectId, attachment } = action.payload;
      return {
        ...state,
        projects: state.projects.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              attachments: (project.attachments || []).map(a => 
                a.id === attachment.id ? attachment : a
              )
            };
          }
          return project;
        })
      };
    }

    case DELETE_PROJECT_ATTACHMENT: {
      const { projectId, attachmentId } = action.payload;
      return {
        ...state,
        projects: state.projects.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              attachments: (project.attachments || []).filter(a => a.id !== attachmentId)
            };
          }
          return project;
        })
      };
    }

    // Task Actions
    case ADD_TASK: {
      const { projectId, task } = action.payload;
      console.log("REDUCER: ADD_TASK", projectId, task);
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (String(project.id) === String(projectId)) {
            const newTask = {
              ...task,
              id: String(task.id || task._id || Date.now()),
              _id: String(task._id || task.id || Date.now()),
              subtasks: task.subtasks || [],
              attachments: task.attachments || [],
              comments: task.comments || [],
              status: task.status || "To Do",
              assignedMembers: task.assignedMembers || [],
              deadline: task.deadline || null,
              createdAt: task.createdAt || new Date().toISOString(),
            };
            console.log("REDUCER: Found project, appending newTask", newTask);
            return {
              ...project,
              tasks: [...(project.tasks || []), newTask],
            };
          }
          return project;
        }),
      };
    }

    case UPDATE_TASK: {
      const { projectId, taskId, updatedData } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (String(project.id) === String(projectId)) {
            return {
              ...project,
              tasks: (project.tasks || []).map((task) =>
                String(task.id) === String(taskId) ? { ...task, ...updatedData } : task
              ),
            };
          }
          return project;
        }),
      };
    }

    case DELETE_TASK: {
      const { projectId, taskId } = action.payload;
      console.log("REDUCER: DELETE_TASK", projectId, taskId);
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (String(project.id) === String(projectId)) {
            console.log("REDUCER: Found project, filtering out taskId", taskId, "from tasks:", project.tasks);
            return {
              ...project,
              tasks: (project.tasks || []).filter((task) => String(task.id) !== String(taskId) && String(task._id) !== String(taskId)),
            };
          }
          return project;
        }),
      };
    }

    case FETCH_TASKS: {
      const { projectId, tasks } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === projectId ? { ...project, tasks } : project
        ),
      };
    }

    // Subtask Actions
    case ADD_SUBTASK: {
      const { projectId, taskId, subtask } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  const newSubtask = {
                    id: Date.now().toString(),
                    ...subtask,
                    completed: false,
                    createdAt: new Date().toISOString(),
                  };
                  return {
                    ...task,
                    subtasks: [...task.subtasks, newSubtask],
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    case UPDATE_SUBTASK: {
      const { projectId, taskId, subtaskId, updatedData } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    subtasks: task.subtasks.map((subtask) =>
                      subtask.id === subtaskId
                        ? { ...subtask, ...updatedData }
                        : subtask
                    ),
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    case DELETE_SUBTASK: {
      const { projectId, taskId, subtaskId } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    subtasks: task.subtasks.filter(
                      (subtask) => subtask.id !== subtaskId
                    ),
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    // Comment Actions
    case ADD_COMMENT: {
      const { projectId, taskId, comment } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    comments: [...(task.comments || []), comment],
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    case UPDATE_COMMENT: {
      const { projectId, taskId, commentId, text } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    comments: task.comments.map((comment) =>
                      comment.id === commentId
                        ? { ...comment, text, updatedAt: new Date().toISOString() }
                        : comment
                    ),
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    case DELETE_COMMENT: {
      const { projectId, taskId, commentId } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    comments: task.comments.filter(
                      (comment) => comment.id !== commentId
                    ),
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    // Attachment Actions
    case ADD_ATTACHMENT: {
      const { projectId, taskId, attachment } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  const newAttachment = {
                    id: Date.now().toString(),
                    ...attachment,
                    uploadedAt: new Date().toISOString(),
                  };
                  return {
                    ...task,
                    attachments: [...task.attachments, newAttachment],
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    case DELETE_ATTACHMENT: {
      const { projectId, taskId, attachmentId } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) => {
                if (task.id === taskId) {
                  return {
                    ...task,
                    attachments: task.attachments.filter(
                      (attachment) => attachment.id !== attachmentId
                    ),
                  };
                }
                return task;
              }),
            };
          }
          return project;
        }),
      };
    }

    // Status and Details Actions
    case UPDATE_TASK_STATUS: {
      const { projectId, taskId, status } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, status } : task
              ),
            };
          }
          return project;
        }),
      };
    }

    case UPDATE_TASK_ASSIGNED_MEMBERS: {
      const { projectId, taskId, members } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, assignedMembers: members } : task
              ),
            };
          }
          return project;
        }),
      };
    }

    case UPDATE_TASK_DEADLINE: {
      const { projectId, taskId, deadline } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tasks: project.tasks.map((task) =>
                task.id === taskId ? { ...task, deadline } : task
              ),
            };
          }
          return project;
        }),
      };
    }

    // Permission Error Handler
    case TASK_PERMISSION_DENIED:
      console.warn('⚠️ Task Permission Denied:', action.payload);
      return {
        ...state,
        permissionError: action.payload,
      };

    case 'ADD_USER_TO_PROJECT': {
      const { projectId, userId } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (String(project.id) === String(projectId)) {
            const assignedUsers = Array.isArray(project.assignedUsers) ? project.assignedUsers : [];
            if (!assignedUsers.includes(userId)) {
              return {
                ...project,
                assignedUsers: [...assignedUsers, userId],
              };
            }
          }
          return project;
        }),
      };
    }

    case 'REMOVE_USER_FROM_PROJECT': {
      const { projectId, userId } = action.payload;
      return {
        ...state,
        projects: state.projects.map((project) => {
          if (String(project.id) === String(projectId)) {
            return {
              ...project,
              assignedUsers: (project.assignedUsers || []).filter(id => String(id) !== String(userId)),
            };
          }
          return project;
        }),
      };
    }

    default:
      return state;
  }
};

export default ToDoReducer;