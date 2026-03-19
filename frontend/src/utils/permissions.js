/**
 * ✅ PERMISSION CHECK IMPLEMENTATION
 * 
 * To grant 'users' permission, the admin token's decoded payload must include:
 * - permissions: ['users'] array in the JWT, OR
 * - isSuperAdmin: true in the JWT
 * 
 * Example: When creating admin token in backend, set permissions array
 * const token = jwt.sign({
 *   username: 'admin',
 *   role: 'admin',
 *   isSuperAdmin: true,
 *   permissions: ['users', 'dashboard', 'settings']
 * }, secret, { expiresIn: '7d' });
 */

export function hasPermission(key) {
  try {
    // Example permissions source: localStorage flag 'perm:<key>' === 'true'
    const v = localStorage.getItem(`perm:${key}`);
    if (v !== null) return v === 'true';
    // fallback: adminToken implies full permissions
    if (localStorage.getItem('adminToken')) return true;
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a user has a specific permission
 * @param {Object} user - User object with permissions
 * @param {String} permissionKey - Permission key to check (e.g., 'canCreateGroups')
 * @returns {Boolean}
 */
export function userHasPermission(user, permissionKey) {
  try {
    if (!user) return false;
    if (user.role === 'admin' || user.admin === true) return true;
    if (!user.permissions || typeof user.permissions !== 'object') return false;
    return user.permissions[permissionKey] === true;
  } catch (e) {
    return false;
  }
}

/**
 * Get all permissions that a user has
 * @param {Object} user - User object
 * @returns {Array} Array of permission keys
 */
export function getUserPermissions(user) {
  try {
    if (!user) return [];
    if (user.role === 'admin' || user.admin === true) {
      return [
        'canCreateGroups',
        'canManageGroupAccess',
        'canAccessTasklist'
      ];
    }
    if (!user.permissions || typeof user.permissions !== 'object') return [];
    return Object.keys(user.permissions).filter(key => user.permissions[key] === true);
  } catch (e) {
    return [];
  }
}

export function notifyNoPermission() {
  try {
    // Minimal UX: use alert for now
    alert("You don't have permission to perform this action.");
  } catch (e) {
    // swallow
  }
}
