/* ================= PRESENCE STORE ================= */
// Centralized store for user presence to avoid circular dependencies.

export const onlineUsers = new Set();
export const userLastSeen = new Map();
export const userSockets = new Map(); // username -> Set(socket.id)
export const offlineTimers = new Map(); // username -> timeoutId
