/**
 * Task Permission Utilities
 * 
 * Only admins can:
 * - Create tasks
 * - Assign members to tasks
 * - Delete tasks
 */

/**
 * Check if the current user is an admin
 * @returns {boolean} true if user is admin, false otherwise
 */
export function isUserAdmin() {
  try {
    return !!localStorage.getItem('adminToken');
  } catch (e) {
    console.error('Error checking admin status:', e);
    return false;
  }
}

/**
 * Notify user about permission denied
 * @param {string} action - The action that was denied (e.g., 'create tasks', 'assign members')
 */
export function notifyTaskPermissionDenied(action) {
  const message = `⛔ Permission Denied: Only administrators can ${action}.`;
  console.warn(message);
  
  try {
    // Show browser alert
    alert(message);
  } catch (e) {
    console.error('Error showing alert:', e);
  }
}

/**
 * Check if user can perform an admin-only task action
 * @param {string} action - The action name for error messaging
 * @returns {boolean} true if user has permission, false otherwise
 */
export function canPerformTaskAction(action) {
  const hasPermission = isUserAdmin();
  
  if (!hasPermission) {
    notifyTaskPermissionDenied(action);
  }
  
  return hasPermission;
}

/**
 * Admin-Only Task Actions:
 * - Create tasks
 * - Assign/update members on tasks
 * - Delete tasks
 * - Close/archive tasks
 * 
 * Regular Users Can:
 * - View tasks assigned to them
 * - Update task status (To Do → In Progress → Done)
 * - Add comments
 * - Upload attachments
 * - Update subtask completion status
 */
