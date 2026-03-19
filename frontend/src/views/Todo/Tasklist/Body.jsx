import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import SimpleBar from 'simplebar-react';
import { Container, Row, Col, Badge, Button, Card, Collapse, Alert, Modal, ListGroup } from 'react-bootstrap';
import {
  addProject,
  addTask,
  updateTaskStatus,
  updateTaskAssignedMembers,
  updateTaskDeadline,
  addComment,
  deleteComment,
  updateComment,
  addAttachment,
  addSubtask,
  deleteTask,
  deleteProject,
  loadProjectsFromDatabase,
  assignProjectToUser,
  removeProjectAssignment,
  addUserToProject,
  removeUserFromProject,
  addProjectAttachment,
  updateProjectAttachment,
  deleteProjectAttachment
} from '../../../redux/action/ToDo';
import { isUserAdmin } from '../../../utils/taskPermissions';
import { userHasPermission } from '../../../utils/permissions';
import { API_BASE } from '../../../config';
import socketService from '../../../utils/socketService';
import './styles/Body.css';

const Body = ({ showInfo }) => {
  const dispatch = useDispatch();
  const { projects, permissionError } = useSelector(state => state.toDoReducer);
  const isAdmin = isUserAdmin();

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUsername = currentUser?.username;

  // Debug logging
  useEffect(() => {
    console.log('📍 Current User Object:', currentUser);
    console.log('📍 Current User ID:', currentUser?._id || currentUser?.id);
  }, [currentUser]);

  // Fetch latest user data with permissions
  useEffect(() => {
    fetch(`${API_BASE}/api/me`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('📥 Fetched user data from /api/me:', data);
        if (data.ok && data.user) {
          console.log('✅ User permissions:', data.user.permissions);
          setMe(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(e => console.error('❌ Failed to fetch user data:', e));
  }, []);

  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedTasks, setExpandedTasks] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [me, setMe] = useState(currentUser);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState(null);
  const [selectedUsersInModal, setSelectedUsersInModal] = useState([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentProjectId, setCommentProjectId] = useState(null);
  const [commentTaskId, setCommentTaskId] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [showEditCommentModal, setShowEditCommentModal] = useState(false);
  const [editCommentProjectId, setEditCommentProjectId] = useState(null);
  const [editCommentTaskId, setEditCommentTaskId] = useState(null);
  const [editCommentId, setEditCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentLoading, setEditCommentLoading] = useState(false);
  
  const addCommentRef = React.useRef(null);
  const editCommentRef = React.useRef(null);

  // Focus textarea when modals open
  useEffect(() => {
    if (showCommentModal) {
      setTimeout(() => addCommentRef .current?.focus(), 300);
    }
  }, [showCommentModal]);

  useEffect(() => {
    if (showEditCommentModal) {
      setTimeout(() => editCommentRef.current?.focus(), 300);
    }
  }, [showEditCommentModal]);

  // Handle adding a comment
  const handleAddComment = async () => {
    console.log('💾 [UI] handleAddComment called', {
      text: commentText.trim().slice(0, 20),
      projectId: commentProjectId,
      taskId: commentTaskId
    });

    if (!commentText.trim()) {
      console.warn('⚠️ [UI] Comment text is empty, skipping submission');
      return;
    }
    
    setCommentLoading(true);
    try {
      console.log('📤 [UI] Dispatching addComment action...');
      const result = await dispatch(addComment(commentProjectId, commentTaskId, commentText.trim()));
      console.log('✅ [UI] addComment action succeeded:', result);
      // Trace logging for comment object
      if (result && result.comment) {
        console.log('📝 [UI] Added comment object:', result.comment);
      }
      setShowCommentModal(false);
      setCommentText('');
    } catch (e) {
      console.error('❌ [UI] Error adding comment:', e);
      alert('Failed to add comment. Please try again.');
    } finally {
      setCommentLoading(false);
    }
  };

  // Handle editing a comment
  const handleEditComment = async () => {
    if (!editCommentText.trim()) return;
    setEditCommentLoading(true);
    try {
      await dispatch(updateComment(editCommentProjectId, editCommentTaskId, editCommentId, editCommentText.trim()));
      setShowEditCommentModal(false); // Changed from true to false to close the modal
      setEditCommentText('');
      setEditCommentId(null);
    } catch (e) {
      console.error('Error editing comment:', e);
      alert('Failed to edit comment. Please try again.');
    } finally {
      setEditCommentLoading(false);
    }
  };

  // Load projects from database on mount
  useEffect(() => {
    dispatch(loadProjectsFromDatabase());

    // Load users for name display (all users) and assignment (admin only)
    setLoadingUsers(true);
    fetch(`${API_BASE}/api/users?for=chat`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('📋 Fetched users:', data.users);
        setUsers(data.users || []);
      })
      .catch(e => console.error('Failed to fetch users:', e))
      .finally(() => setLoadingUsers(false));
  }, [dispatch, isAdmin]);

  useEffect(() => {
    console.log("REACT UI: projects state updated", projects);
  }, [projects]);


  // 1. Stable Socket Listeners (Run once or when currentUsername changes)
  useEffect(() => {
    const socket = socketService.connect();
    if (!socket) return;

    const handleCommentAdded = (data) => {
      console.log('💬 [EVENT: comment_added] Received:', data);
      const { author } = data;
      
      // Case-insensitive check to skip own notifications
      if (author?.username?.toLowerCase() === currentUsername?.toLowerCase()) {
        console.log('🤐 Skipping notification - comment is from current user');
        return;
      }

      console.log('📣 [NOTIFICATION] Showing comment_added notification');
      socketService.pushNotification({
        id: `comment-${data.commentId || Date.now()}`,
        icon: '💬',
        title: 'New comment',
        body: `${author.name || author.username} commented on a task`,
        link: `/apps/todo/task-list?projectId=${data.projectId}&taskId=${data.taskId}`
      });
      
      dispatch(loadProjectsFromDatabase());
    };

    const handleCommentUpdated = (data) => {
      console.log('✏️ [EVENT: comment_updated] Received:', data);
      const { author } = data;
      
      if (author?.username?.toLowerCase() === currentUsername?.toLowerCase()) {
        return;
      }

      socketService.pushNotification({
        id: `comment-update-${data.commentId || Date.now()}`,
        icon: '✏️',
        title: 'Comment updated',
        body: `${author.name || author.username} edited a comment`,
        link: `/apps/todo/task-list?projectId=${data.projectId}&taskId=${data.taskId}`
      });
      
      dispatch(loadProjectsFromDatabase());
    };

    const handleCommentDeleted = (data) => {
      console.log('🗑️ [EVENT: comment_deleted] Received:', data);
      const { author } = data;
      
      if (author?.username?.toLowerCase() === currentUsername?.toLowerCase()) {
        return;
      }

      socketService.pushNotification({
        id: `comment-delete-${data.commentId || Date.now()}`,
        icon: '🗑️',
        title: 'Comment deleted',
        body: `${author.name || author.username} deleted a comment`,
        link: '/apps/todo/task-list'
      });
      
      dispatch(loadProjectsFromDatabase());
    };

    socket.on('comment_added', handleCommentAdded);
    socket.on('comment_updated', handleCommentUpdated);
    socket.on('comment_deleted', handleCommentDeleted);

    return () => {
      socket.off('comment_added', handleCommentAdded);
      socket.off('comment_updated', handleCommentUpdated);
      socket.off('comment_deleted', handleCommentDeleted);
    };
  }, [dispatch, currentUsername]);

  // 2. Dynamic Room Management (Depends on projects)
  useEffect(() => {
    if (!projects || projects.length === 0) return;

    const socket = socketService.connect();
    if (!socket) return;

    // Join rooms for all current projects/tasks
    const activeRooms = [];
    projects.forEach(project => {
      project.tasks?.forEach(task => {
        const roomId = `task-${project.id || project._id}-${task.id || task._id}`;
        socket.emit('join', roomId);
        activeRooms.push(roomId);
      });
    });

    console.log(`📡 [ROOMS] Joined ${activeRooms.length} task rooms`);

    return () => {
      // Leave rooms when projects change or component unmounts
      activeRooms.forEach(roomId => {
        socket.emit('leave', roomId);
      });
    };
  }, [projects]);

  const location = useLocation();

  // 3. Deep Linking: Handle projectId and taskId from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlProjectId = params.get('projectId');
    const urlTaskId = params.get('taskId');

    if (urlProjectId || urlTaskId) {
      console.log('🔗 [DEEP LINK] Processing URL params:', { urlProjectId, urlTaskId });
      
      const processLink = () => {
        if (urlProjectId) {
          setExpandedProjects(prev => ({ ...prev, [urlProjectId]: true }));
        }
        
        if (urlTaskId) {
          setExpandedTasks(prev => ({ ...prev, [urlTaskId]: true }));
          setTimeout(() => {
            const el = document.getElementById(`task-${urlTaskId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.transition = 'background-color 0.5s';
              el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              setTimeout(() => { el.style.backgroundColor = 'transparent'; }, 2000);
            }
          }, 300);
        }
      };

      if (!projects || projects.length === 0) {
        console.log('⏳ Waiting for projects to load for deep link...');
      } else {
        processLink();
      }
    }
  }, [location.search, projects]); // Added projects as dependency

  // Toggle project expansion
  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Toggle task expansion
  const toggleTask = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
    if (selectedTask?.id !== taskId) {
      setSelectedTask(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u._id === userId || u.id === userId);
    return user?.username || 'Unknown User';
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'To Do': 'secondary',
      'In Progress': 'warning',
      'In Review': 'info',
      'Done': 'success',
      'Blocked': 'danger',
      'On Hold': 'light'
    };
    return colors[status] || 'secondary';
  };

  // Handle Project File Upload
  const handleProjectFileUpload = async (projectId, e, fileType = 'new') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      alert(`File "${file.name}" is too large (${sizeMB}MB). Maximum size is 10MB.`);
      e.target.value = null;
      return;
    }

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result.split(',')[1];
        const fileData = {
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileData: base64String,
          fileType  // 'new' or 'updated'
        };
        await dispatch(addProjectAttachment(projectId, fileData));
        e.target.value = null; // Clear input
      };
      reader.onerror = () => alert('Failed to read file');
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    }
  };



  // Handle Project File Delete
  const handleProjectFileDelete = (projectId, attachmentId, filename) => {
    if (!attachmentId) {
      console.error('❌ Cannot delete attachment: ID is missing', { projectId, attachmentId, filename });
      alert('Error: Attachment ID is missing. Cannot delete.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${filename}?`)) {
      dispatch(deleteProjectAttachment(projectId, attachmentId));
    }
  };

  return (
    <div className="todo-body">
      <SimpleBar className="nicescroll-bar">
        <Container fluid className="px-4 py-3">
          {/* Permission Error Alert */}
          {permissionError && (
            <Alert variant="danger" dismissible className="mb-3">
              <strong>⛔ Permission Denied:</strong> {permissionError}
            </Alert>
          )}

          {/* Add Project Button - Permission Required */}
          {console.log('🔍 Project Permission Check:', { 
            isAdmin, 
            me, 
            hasPermission: userHasPermission(me, 'canAccessTasklist'),
            permissions: me?.permissions 
          })}
          {(isAdmin || userHasPermission(me, 'canAccessTasklist')) ? (
            <div className="mb-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const projectName = prompt('Enter project name:');
                  if (projectName) {
                    dispatch(addProject({
                      name: projectName,
                      description: '',
                    }));
                  }
                }}
              >
                <i className="ri-add-line me-1"></i>
                Create Project
              </Button>
            </div>
          ) : (
            <Alert variant="warning" className="mb-3 py-2">
              <small>You do not have permission to create projects. Contact administrator.</small>
            </Alert>
          )}

          {/* Projects Display */}
          {projects.length === 0 ? (
            <Alert variant="info" className="mt-3">
              <strong>No projects yet.</strong> {isAdmin ? 'Create a new project to get started.' : ''}
            </Alert>
          ) : (
            <div className="projects-list">
              {projects.map(project => (
                <Card key={project._id} className="mb-3 project-card">
                  <Card.Header
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div
                      className="cursor-pointer flex-grow-1 d-flex align-items-center"
                      onClick={() => toggleProject(project._id)}
                    >
                      <i className={`ri-folder-line me-2 ${expandedProjects[project._id] ? 'ri-folder-open-line' : ''}`}></i>
                      <strong className="project-title">{project.name}</strong>
                      <Badge bg="secondary" className="ms-2">{project.tasks?.length || 0} tasks</Badge>
                      {project.assignedUsers && project.assignedUsers.length > 0 && (
                        <div className="d-flex gap-1 flex-wrap ms-2">
                          {project.assignedUsers.map(userId => (
                            <Badge key={userId} bg="info">
                              <i className="ri-user-line me-1"></i>
                              {getUserName(userId)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <small className="text-muted me-3">{formatDate(project.createdAt)}</small>
                    {(isAdmin || project.userId === currentUser?._id || project.userId === currentUser?.id) && (
                      <Button
                        size="sm"
                        variant="outline-info"
                        className="flex-shrink-0 me-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectForAssignment(project);
                          setSelectedUsersInModal(project.assignedUsers || []);
                          setShowAssignModal(true);
                        }}
                        title="Manage user assignments"
                        disabled={loadingUsers}
                      >
                        <i className="ri-user-settings-line"></i>
                      </Button>
                    )}
                    {(isAdmin || project.userId === currentUser?._id || project.userId === currentUser?.id) && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="flex-shrink-0"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete the project "${project.name}" and all its tasks?`)) {
                            console.log(`🗑️ Deleting project: ${project.name}`);
                            await dispatch(deleteProject(project.id));
                            console.log(`✅ Project deleted. Reloading projects...`);
                            await dispatch(loadProjectsFromDatabase());
                            console.log(`✅ Projects reloaded successfully`);
                          }
                        }}
                      >
                        <i className="ri-delete-bin-line"></i>
                      </Button>
                    )}
                  </Card.Header>

                  <Collapse in={expandedProjects[project._id]}>
                    <Card.Body className="project-body">
                      {project.description && (
                        <p className="text-muted mb-3">{project.description}</p>
                      )}

                      {/* ── Project Files Section ── */}
                      <div className="project-attachments mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0 text-muted"><i className="ri-attachment-2 me-1"></i>Project Files</h6>
                          <div>
                            <input
                              type="file"
                              id={`upload-file-${project._id}`}
                              className="d-none"
                              onChange={(e) => handleProjectFileUpload(project._id, e, 'new')}
                            />
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => document.getElementById(`upload-file-${project._id}`).click()}
                            >
                              <i className="ri-upload-2-line me-1"></i> Upload File
                            </Button>
                          </div>
                        </div>

                        {(() => {
                          const newFiles = (project.attachments || []).filter(a => a.fileType !== 'updated');
                          return newFiles.length > 0 ? (
                            <ListGroup className="file-list">
                              {newFiles.map((attachment, index) => (
                                <ListGroup.Item key={attachment.id || `new-${project._id}-${index}`} className="d-flex justify-content-between align-items-center py-2">
                                  <div>
                                    <i className="ri-file-text-line me-2 text-primary"></i>
                                    <strong>{attachment.name}</strong>
                                    <small className="text-muted ms-2">
                                      {(attachment.size / 1024).toFixed(1)} KB • {attachment.uploadedBy}
                                    </small>
                                  </div>
                                  <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-info" href={`${API_BASE}${attachment.url}`} download={attachment.name} target="_blank" title="Download">
                                      <i className="ri-download-2-line"></i>
                                    </Button>
                                    {(isAdmin || attachment.uploadedBy === currentUsername) && attachment.id && (
                                      <Button size="sm" variant="outline-danger" onClick={() => handleProjectFileDelete(project._id, attachment.id, attachment.name)} title="Delete">
                                        <i className="ri-delete-bin-line"></i>
                                      </Button>
                                    )}
                                  </div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          ) : (
                            <Alert variant="light" className="py-2 text-center text-muted mb-0 border">No project files attached.</Alert>
                          );
                        })()}
                      </div>

                      {/* ── Updated Files Section ── */}
                      <div className="project-attachments mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0 text-muted"><i className="ri-refresh-line me-1 text-success"></i>Updated Files</h6>
                          <div>
                            <input
                              type="file"
                              id={`upload-updated-file-${project._id}`}
                              className="d-none"
                              onChange={(e) => handleProjectFileUpload(project._id, e, 'updated')}
                            />
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => document.getElementById(`upload-updated-file-${project._id}`).click()}
                            >
                              <i className="ri-refresh-line me-1"></i> Updated File
                            </Button>
                          </div>
                        </div>

                        {(() => {
                          const updatedFiles = (project.attachments || []).filter(a => a.fileType === 'updated');
                          return updatedFiles.length > 0 ? (
                            <ListGroup className="file-list">
                              {updatedFiles.map((attachment, index) => (
                                <ListGroup.Item key={attachment.id || `updated-${project._id}-${index}`} className="d-flex justify-content-between align-items-center py-2">
                                  <div>
                                    <i className="ri-refresh-line me-2 text-success"></i>
                                    <strong>{attachment.name}</strong>
                                    <small className="text-muted ms-2">
                                      {(attachment.size / 1024).toFixed(1)} KB • {attachment.uploadedBy}
                                    </small>
                                  </div>
                                  <div className="d-flex gap-2">
                                    <Button size="sm" variant="outline-info" href={`${API_BASE}${attachment.url}`} download={attachment.name} target="_blank" title="Download">
                                      <i className="ri-download-2-line"></i>
                                    </Button>
                                    {(isAdmin || attachment.uploadedBy === currentUsername) && attachment.id && (
                                      <Button size="sm" variant="outline-danger" onClick={() => handleProjectFileDelete(project._id, attachment.id, attachment.name)} title="Delete">
                                        <i className="ri-delete-bin-line"></i>
                                      </Button>
                                    )}
                                  </div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          ) : (
                            <Alert variant="light" className="py-2 text-center text-muted mb-0 border">No updated files yet.</Alert>
                          );
                        })()}
                      </div>

                      {project.tasks && project.tasks.length > 0 ? (
                        <div className="tasks-list">
                          {project.tasks.map(task => (
          <Card key={task.id} id={`task-${task.id}`} className="mb-2 task-card border-start border-4" style={{ borderLeftColor: `var(--bs-${getStatusColor(task.status)})` }}>
                              <Card.Header
                                className="cursor-pointer d-flex justify-content-between align-items-start"
                              onClick={() => toggleTask(task.id)}
                              >
                                <div style={{ flex: 1 }}>
                                  <i className="ri-checkbox-line me-2"></i>
                                  <strong className="task-title">{task.title}</strong>
                                  <Badge bg={getStatusColor(task.status)} className="ms-2">
                                    {task.status}
                                  </Badge>
                                  {task.deadline && (
                                    <Badge bg="secondary" className="ms-2 opacity-75">
                                      <i className="ri-calendar-line me-1"></i>
                                      {formatDate(task.deadline)}
                                    </Badge>
                                  )}
                                </div>
                                <i className={`ri-chevron-down-line ${expandedTasks[task.id] ? 'rotate' : ''}`}></i>
                              </Card.Header>

                              <Collapse in={expandedTasks[task.id]}>
                                <Card.Body className="task-details">
                                  {/* Task Description */}
                                  {task.description && (
                                    <div className="mb-3">
                                      <p className="text-muted">{task.description}</p>
                                    </div>
                                  )}

                                  <Row className="mb-3">
                                    {/* Status */}
                                    <Col md={6} className="mb-2">
                                      <label className="small text-muted d-block">Status</label>
                                      <div className="d-flex gap-1 flex-wrap">
                                        {['To Do', 'In Progress', 'In Review', 'Done'].map(status => (
                                          <Button
                                            key={status}
                                            size="sm"
                                            variant={task.status === status ? getStatusColor(status) : 'outline-secondary'}
                                            onClick={() => dispatch(updateTaskStatus(project.id, task.id, status))}
                                          >
                                            {status}
                                          </Button>
                                        ))}
                                      </div>
                                    </Col>


                                  </Row>

                                  {/* Subtasks */}
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <div className="mb-3">
                                      <label className="small text-muted d-block mb-2">
                                        <strong>Subtasks ({task.subtasks.filter(s => s.completed).length}/{task.subtasks.length})</strong>
                                      </label>
                                      <div className="subtasks-list">
                                        {task.subtasks.map(subtask => (
                                          <div key={subtask.id} className="d-flex align-items-center mb-2 p-2 rounded border" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <input
                                              type="checkbox"
                                              defaultChecked={subtask.completed}
                                              className="form-check-input me-2"
                                            />
                                            <span className={subtask.completed ? 'text-muted text-decoration-line-through' : ''}>
                                              {subtask.title}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Attachments */}
                                  {task.attachments && task.attachments.length > 0 && (
                                    <div className="mb-3">
                                      <label className="small text-muted d-block mb-2">
                                        <strong><i className="ri-attachment-2 me-1"></i>Attachments ({task.attachments.length})</strong>
                                      </label>
                                      <div className="attachments-list">
                                        {task.attachments.map(attachment => (
                                          <a
                                            key={attachment.id}
                                            href={attachment.url}
                                            className="attachment-item d-block mb-2 p-2 border rounded text-decoration-none"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <i className="ri-file-line me-2"></i>
                                            {attachment.name}
                                            <small className="text-muted d-block">{attachment.size}</small>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Comments */}
                                  {task.comments && task.comments.length > 0 && (
                                    <div className="mb-3">
                                      <label className="small text-muted d-block mb-2">
                                        <strong><i className="ri-chat-3-line me-1"></i>Comments ({task.comments.length})</strong>
                                      </label>
                                      <div className="comments-list">
                                        {task.comments && Array.isArray(task.comments) && task.comments.length > 0 ? (
                                          task.comments.map(comment => {
                                            // Convert both to strings for reliable comparison
                                            const currentUserId = currentUser?._id ? String(currentUser._id) : String(currentUser?.id || '');
                                            const currentUsername = currentUser?.username || '';
                                            const commentAuthorId = String(comment.author?.id || '');
                                            const commentAuthorUsername = comment.author?.username || '';
                                            
                                            // Match by ID first, then by username as fallback
                                            const isCommentAuthorById = currentUserId === commentAuthorId && currentUserId !== '';
                                            const isCommentAuthorByUsername = currentUsername && currentUsername === commentAuthorUsername && currentUsername !== '';
                                            const isCommentAuthor = isCommentAuthorById || isCommentAuthorByUsername;
                                            const canDelete = isCommentAuthor || isAdmin;
                                            
                                            console.log(`✏️ Comment Author Check:`);
                                            console.log(`   - CurrentUserId: "${currentUserId}", CommentAuthorId: "${commentAuthorId}", MatchID: ${isCommentAuthorById}`);
                                            console.log(`   - CurrentUsername: "${currentUsername}", CommentAuthorUsername: "${commentAuthorUsername}", MatchUsername: ${isCommentAuthorByUsername}`);
                                            console.log(`   - IsCommentAuthor: ${isCommentAuthor}, CanDelete: ${canDelete}, IsAdmin: ${isAdmin}`);
                                            
                                            return (
                                              <div key={comment.id} className="comment-item mb-2 p-2 rounded border" style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <div className="d-flex justify-content-between align-items-start">
                                                  <div>
                                                    <strong className="small">{comment.author?.name || 'Anonymous'}</strong>
                                                    <small className="text-muted d-block">
                                                      {new Date(comment.createdAt).toLocaleDateString()}
                                                    </small>
                                                  </div>
                                                  {canDelete && (
                                                    <div className="d-flex gap-2">
                                                      <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-primary p-0"
                                                        title="Edit comment"
                                                        onClick={() => {
                                                          setEditCommentProjectId(project.id);
                                                          setEditCommentTaskId(task.id);
                                                          setEditCommentId(comment.id);
                                                          setEditCommentText(comment.text);
                                                          setShowEditCommentModal(true);
                                                        }}
                                                      >
                                                        <i className="ri-edit-line"></i>
                                                      </button>
                                                      <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-danger p-0"
                                                        title="Delete comment"
                                                        onClick={() => dispatch(deleteComment(project.id, task.id, comment.id))}
                                                      >
                                                        <i className="ri-delete-bin-line"></i>
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                                <p className="text-muted mb-0 mt-1">{comment.text}</p>
                                              </div>
                                            );
                                          })
                                        ) : (
                                          <p className="text-muted small">No comments yet</p>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Quick Actions */}
                                  <div className="quick-actions mt-3 pt-3 border-top">
                                    {isAdmin && (
                                      <Button
                                        size="sm"
                                        variant="danger"
                                        className="me-2"
                                        onClick={() => dispatch(deleteTask(project.id, task.id))}
                                      >
                                        <i className="ri-delete-bin-line me-1"></i>
                                        Delete Task
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="outline-secondary"
                                      onClick={() => {
                                        setCommentProjectId(project.id);
                                        setCommentTaskId(task.id);
                                        setCommentText('');
                                        setShowCommentModal(true);
                                      }}
                                    >
                                      <i className="ri-chat-3-line me-1"></i>
                                      Add Comment
                                    </Button>
                                  </div>
                                </Card.Body>
                              </Collapse>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Alert variant="light" className="mb-3">
                          No tasks created yet.
                        </Alert>
                      )}

                      {/* Add Task Button - Permission Required */}
                      {console.log('🔍 Task Permission Check:', { 
                        isAdmin, 
                        me, 
                        hasPermission: userHasPermission(me, 'canAccessTasklist'),
                        permissions: me?.permissions 
                      })}
                      {(isAdmin || userHasPermission(me, 'canAccessTasklist')) ? (
                        <Button
                          variant="success"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            const taskTitle = prompt('Enter task title:');
                            if (taskTitle) {
                              dispatch(addTask(project.id, {
                                title: taskTitle,
                                description: '',
                              }));
                            }
                          }}
                        >
                          <i className="ri-add-line me-1"></i>
                          Add Task
                        </Button>
                      ) : (
                        <Alert variant="warning" className="mt-2 mb-0 py-2">
                          <small>You do not have permission to add tasks. Contact administrator.</small>
                        </Alert>
                      )}
                    </Card.Body>
                  </Collapse>
                </Card>
              ))}
            </div>
          )}
        </Container>
      </SimpleBar>

      {/* Assign User Modal */}
      <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Manage Access for {selectedProjectForAssignment?.name || 'Project'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingUsers ? (
            <p className="text-muted text-center">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted text-center">No users available</p>
          ) : (
            <ListGroup>
              {users
                .filter(user => user._id !== currentUser?._id && user._id !== currentUser?.id)
                .map(user => {
                const isSelected = selectedUsersInModal.includes(user._id);
                return (
                  <ListGroup.Item
                    key={user._id}
                    as="button"
                    className="text-start d-flex justify-content-between align-items-center"
                    style={{
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      borderColor: isSelected ? 'var(--db-accent)' : 'var(--bs-border-color)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedUsersInModal(prev => {
                        if (prev.includes(user._id)) {
                          return prev.filter(id => id !== user._id);
                        } else {
                          return [...prev, user._id];
                        }
                      });
                    }}
                  >
                    <span>
                      <i className="ri-user-line me-2"></i>
                      {user.username}
                    </span>
                    {isSelected && (
                      <Badge bg="success">
                        <i className="ri-check-line me-1"></i>
                        Selected
                      </Badge>
                    )}
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAssignModal(false);
              setSelectedProjectForAssignment(null);
              setSelectedUsersInModal([]);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (selectedProjectForAssignment) {
                // Find users to add and remove
                const currentUsers = selectedProjectForAssignment.assignedUsers || [];
                const usersToAdd = selectedUsersInModal.filter(id => !currentUsers.includes(id));
                const usersToRemove = currentUsers.filter(id => !selectedUsersInModal.includes(id));

                console.log(`🔄 Starting assignment update: adding ${usersToAdd.length}, removing ${usersToRemove.length}`);

                // Remove users - await each removal to ensure API calls complete
                for (const userId of usersToRemove) {
                  console.log(`🗑️ Removing user ${userId} from project`);
                  await dispatch(removeUserFromProject(selectedProjectForAssignment._id, userId));
                }

                // Add new users - await each addition to ensure API calls complete
                for (const userId of usersToAdd) {
                  console.log(`➕ Adding user ${userId} to project`);
                  await dispatch(addUserToProject(selectedProjectForAssignment._id, userId));
                  // 🔔 Notify (Admin local notification)
                  // Use String() for robust comparison regardless of whether ID is string or ObjectId
                  const addedUser = users.find(u => String(u._id || u.id) === String(userId));
                  const uname = addedUser?.username || addedUser?.name || 'A user';
                  socketService.pushNotification({
                    icon: '📁',
                    title: 'User added to project',
                    body: `${uname} was added to "${selectedProjectForAssignment.name}"`,
                    link: '/apps/todo/task-list'
                  });
                }

                console.log(`✅ All assignment changes complete. Reloading projects...`);


                await dispatch(loadProjectsFromDatabase());

                console.log(`✅ Projects reloaded successfully`);

                setShowAssignModal(false);
                setSelectedProjectForAssignment(null);
                setSelectedUsersInModal([]);
              }
            }}
          >
            Save Assignments
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Comment Modal */}
      <Modal show={showCommentModal} onHide={() => setShowCommentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="ri-chat-3-line me-2"></i>
            Add Comment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="mb-3">
              <label htmlFor="commentText" className="form-label">Comment</label>
              <textarea
                ref={addCommentRef}
                id="commentText"
                className="form-control"
                rows="4"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddComment();
                  }
                }}
                disabled={commentLoading}
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCommentModal(false);
              setCommentText('');
            }}
            disabled={commentLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleAddComment}
            disabled={commentLoading || !commentText.trim()}
          >
            {commentLoading ? 'Adding...' : 'Add Comment'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Comment Modal */}
      <Modal show={showEditCommentModal} onHide={() => setShowEditCommentModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="ri-edit-line me-2"></i>
            Edit Comment
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form>
            <div className="mb-3">
              <label htmlFor="editCommentText" className="form-label">Comment</label>
              <textarea
                ref={editCommentRef}
                id="editCommentText"
                className="form-control"
                rows="4"
                placeholder="Edit your comment..."
                value={editCommentText}
                onChange={(e) => setEditCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleEditComment();
                  }
                }}
                disabled={editCommentLoading}
              />
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditCommentModal(false);
              setEditCommentText('');
              setEditCommentId(null);
            }}
            disabled={editCommentLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleEditComment}
            disabled={editCommentLoading || !editCommentText.trim()}
          >
            {editCommentLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Body;
