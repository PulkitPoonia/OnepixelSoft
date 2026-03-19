/* ================= NOTIFICATION STORE ================= */
// Handles persistent storage and delivery of missed notifications.

import { onlineUsers } from './presenceStore.js';

/**
 * Queues a notification in the database if the user is offline.
 * If the user is online, it returns false so the caller can emit it immediately.
 */
export async function queueNotification(db, username, notification) {
  // If user is online, don't queue (real-time is handled by the caller)
  if (onlineUsers.has(username)) {
    return false;
  }

  console.log(`📥 [NOTIF] Queuing missed notification for: ${username}`);
  
  try {
    await db.collection('missed_notifications').insertOne({
      username,
      notification,
      createdAt: new Date(),
      delivered: false
    });
    return true;
  } catch (err) {
    console.error('❌ [NOTIF] Failed to queue notification:', err);
    return false;
  }
}

/**
 * Delivers all missed notifications for a user via their active socket.
 */
export async function deliverMissedNotifications(socket, db) {
  const username = socket.username;
  if (!username) return;

  try {
    const missed = await db.collection('missed_notifications')
      .find({ username, delivered: false })
      .sort({ createdAt: 1 })
      .toArray();

    if (missed.length > 0) {
      console.log(`📤 [NOTIF] Delivering ${missed.length} missed notifications to: ${username}`);
      
      for (const item of missed) {
        socket.emit('push_notification', item.notification);
      }

      // Mark as delivered or delete
      await db.collection('missed_notifications').deleteMany({
        _id: { $in: missed.map(m => m._id) }
      });
      
      console.log(`✅ [NOTIF] All missed notifications delivered and cleared for: ${username}`);
    }
  } catch (err) {
    console.error('❌ [NOTIF] Failed to deliver missed notifications:', err);
  }
}
