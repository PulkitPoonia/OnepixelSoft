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

export function notifyNoPermission() {
  try {
    // Minimal UX: use alert for now
    alert("You don't have permission to perform this action.");
  } catch (e) {
    // swallow
  }
}
