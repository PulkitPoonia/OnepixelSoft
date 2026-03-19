import { io } from "socket.io-client";
import store from "../redux/store";
import debugger_ from "./debugger";

import { API_BASE as SOCKET_URL } from "../config";

// ✅ Global notification queue - works even if CompactMenu hasn't mounted
const notificationQueue = [];

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.pendingRoom = null;
  }

  /* ================= AUTH ================= */

  getToken() {
    const token =
      localStorage.getItem("adminToken") ||
      localStorage.getItem("accessToken");

    console.log("🔥 TOKEN FROM LS:", token);

    return token;
  }

  getUser() {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }

  /* ================= CONNECT ================= */

  connect() {
    const token = this.getToken();
    const user = this.getUser();

    if (!token || !user?.username) {
      console.warn("❌ Missing token or user");
      return;
    }

    // ✅ prevent duplicate - if socket exists and connected, reuse it
    if (this.socket) {
      if (this.socket.connected) {
        console.log("✅ Socket already connected:", user.username);
        return this.socket;
      }
      // If socket exists but disconnected, try to reconnect it instead of creating new
      if (!this.socket.connected) {
        console.log("🔄 Socket exists but disconnected - trying to reconnect");
        this.socket.connect();
        return this.socket;
      }
    }

    this.socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity, 
      reconnectionDelay: 1000, 
      reconnectionDelayMax: 10000, 
      timeout: 10000, 
      forceNew: false,
      multiplex: true,
      autoConnect: true,
      pingInterval: 30000, 
      pingTimeout: 5000, 
    });

    this.socket.on('message_updated', ({ message, conversationId }) => {
      store.dispatch({
        type: 'UPDATE_SINGLE_MESSAGE',
        message,
        conversationId,
      });
    });
    /* ================= SEEN UPDATE ================= */

this.socket.on("messages_seen", ({ conversationId, seenBy }) => {
  console.log("👁 messages_seen received:", { conversationId, seenBy });

  store.dispatch({
    type: "MESSAGES_SEEN",
    conversationId,
    seenBy
  });
});

    /* ===== CONNECT ===== */
    this.socket.on("connect", () => {
      console.log("🔥 Connected:", user.username);
      console.log('🟢 User is now ONLINE');

      this.isConnected = true;

      console.log('📡 Re-registering presence listeners on connect');

      this.socket.emit("join", user.username);

      if (this.pendingRoom) {
        this.socket.emit("join", this.pendingRoom);
        this.pendingRoom = null;
      }

      const state = store.getState();
      if (state.chatReducer) {
        console.log('📦 Reloading conversations after socket reconnect');
        import('../redux/action/Chat').then(({ loadConversations, syncMessagesOnReconnect }) => {
          if (loadConversations) {
            store.dispatch(loadConversations());
          }
          if (syncMessagesOnReconnect) {
            setTimeout(() => {
              console.log('🔄 Starting message sync after conversations loaded');
              store.dispatch(syncMessagesOnReconnect());
            }, 500);
          }
        });
      }
    });

    /* ===== ERROR ===== */
    this.socket.on("connect_error", (err) => {
      console.error("❌ Socket Error:", err.message);
      this.isConnected = false;
      
      // If unauthorized or connection failed, force logout to login page
      if (err.message === "xhr poll error" || err.message === "websocket error") {
         console.warn("⚠️ Critical connection error - redirecting to login");
         this.disconnect(true); // Treat as logout to trigger cleanup
         window.location.href = "/auth/login";
      }
    });

    /* ===== DISCONNECT ===== */
    this.socket.on("disconnect", (reason) => {
      console.warn("⚠️ Socket Disconnected:", reason);
      this.isConnected = false;

      // If disconnected by server or transport error (unintentional), redirect to login
      if (reason === "io server disconnect" || reason === "transport close") {
        console.warn("⚠️ Unintentional disconnect - redirecting to login");
        
        // Clear auth data
        localStorage.removeItem("accessToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");
        
        window.location.href = "/auth/login";
      }
    });

    /* ===== RECONNECT ATTEMPT ===== */
    this.socket.on("reconnect_attempt", () => {
      console.log("🔄 Socket reconnect attempt in progress...");
    });

    /* ===== RECONNECT ===== */
    this.socket.on("reconnect", () => {
      console.log("✅ Socket successfully reconnected:", user.username);
    });

    /* ================= PRESENCE UPDATES ================= */
    this.socket.on("user_online", ({ username }) => {
      console.log('🟢 SOCKET SERVICE: USER_ONLINE EVENT:', { username, timestamp: new Date().toLocaleTimeString() });
      console.log('📤 Dispatching UPDATE_PRESENCE with isOnline=true for:', username);
      store.dispatch({
        type: 'UPDATE_PRESENCE',
        username,
        isOnline: true,
        lastSeen: null
      });
    });

    this.socket.on("user_offline", ({ username, lastSeen }) => {
      console.log('🔴 SOCKET SERVICE: USER_OFFLINE EVENT:', { username, lastSeen, timestamp: new Date().toLocaleTimeString() });
      console.log('📤 Dispatching UPDATE_PRESENCE with isOnline=false for:', username);
      store.dispatch({
        type: 'UPDATE_PRESENCE',
        username,
        isOnline: false,
        lastSeen
      });
    });

    /* ================= RECEIVE MESSAGE ================= */

    this.socket.on("receive_message", (msg) => {
      if (!msg?.conversationId) {
        console.log('❌ Skipped receive_message: no conversationId', { msg });
        return;
      }

      console.log('🔔 Socket: receive_message event received', {
        msgId: msg._id?.toString?.().slice?.(-6),
        conversationId: msg.conversationId?.toString?.().slice?.(-6),
        senderName: msg.senderName,
        isGroup: msg.conversationData?.isGroup,
        groupName: msg.conversationData?.groupName,
        messageText: msg.text?.slice?.(0, 100)  // Add first 100 chars of message text
      });

      const me = this.getUser();
      const state = store.getState();
      const existing = state.chatReducer.messages[msg.conversationId] || [];
      const isMine = msg.senderId === me.username;

      // Check for duplicates
      const isDuplicate = existing.find((m) => String(m._id) === String(msg._id));
      if (isDuplicate) {
        console.log('⚠️ Duplicate message - skipping:', { msgId: msg._id?.toString().slice(-6) });
        return;
      }

      // Handle seen/delivery status
      if (!isMine) {
        const isChatPage = window.location.pathname.includes('/chat');
        const chatIsOpen = state.chatReducer.currentConversationId === msg.conversationId;
        
        // Always confirm delivery
        this.confirmDelivery(msg._id, msg.conversationId);
        
        // If chat is open AND we are on a chat page, mark as seen
        if (chatIsOpen && isChatPage) {
          this.confirmSeen([msg._id], msg.conversationId);
        }
      }

      const payload = {
        ...msg,
        types: isMine ? "sent" : "received",
        seenBy: Array.isArray(msg.seenBy) ? msg.seenBy : [],
        deliveredTo: Array.isArray(msg.deliveredTo) ? msg.deliveredTo : [],
      };

      console.log('📨 Dispatching SENT_MSG from socketService:', { 
        msgId: msg._id?.toString().slice(-6),
        conversationId: msg.conversationId?.toString?.().slice?.(-6),
        types: payload.types
      });
      
      store.dispatch({
        type: "SENT_MSG",
        payload,
      });

      // 🔔 Push notification log
      const chatIsOpen = state.chatReducer.currentConversationId === msg.conversationId;
      console.log('🔔 Notification check:', { 
        isMine, 
        chatIsOpen, 
        currentId: state.chatReducer.currentConversationId, 
        msgId: msg.conversationId,
        isGroup: msg.conversationData?.isGroup,
        notifDefined: typeof window._pushNotification === 'function'
      });

      if (!isMine) {
        const isChatPage = window.location.pathname.includes('/chat');
        const chatIsOpen = state.chatReducer.currentConversationId === msg.conversationId;

        if (!chatIsOpen || !isChatPage) {
          const sender = msg.senderName || msg.senderId || 'Someone';
          const isGroup = msg.conversationData?.isGroup;
          const groupName = msg.conversationData?.groupName || 'Group';
          
          console.log('🔔 Triggering notification for:', { sender, isGroup, groupName, isChatPage, chatIsOpen });
          
          // ✅ Use new notification system with fallback queue
          this.pushNotification({
            icon: '💬',
            title: isGroup ? `${sender} in ${groupName}` : `Message from ${sender}`,
            body: msg.text || (msg.attachments?.length ? '📎 Attachment' : ''),
            isGroup: !!msg.conversationData?.isGroup,
            link: isGroup 
              ? `/apps/chat/chat-groups?conversation=${msg.conversationId}` 
              : `/apps/chat/chats?conversation=${msg.conversationId}`
          });
        }
      }

    });  // end receive_message

    /* ================= NEW CONVERSATION (INVITE) ================= */
    this.socket.on('new_conversation', (data) => {
      console.log('📦 Socket: new_conversation received:', data.conversationId);
      if (data.conversationId) {
        this.socket.emit('join', String(data.conversationId));
      }
    });

    /* =================  REACTION ================= */

    this.socket.on(
      "reaction_update",
      ({ messageId, conversationId, reactions }) => {
        store.dispatch({
          type: "ADD_REACTION",
          messageId,
          conversationId,
          reactions,
        });
      }
    );
    /* ================= MESSAGE DELIVERED ================= */

this.socket.on("message_delivered", ({ messageId, conversationId, deliveredTo }) => {
  console.log("📦 message_delivered received:", { messageId, conversationId, deliveredTo });

  store.dispatch({
    type: "UPDATE_MESSAGE_DELIVERED",
    conversationId,
    messageId,
    deliveredTo
  });
});

    /* ================= DELETE ================= */

this.socket.on(
  "message_deleted",
  ({ messageId, conversationId, user, forEveryone }) => {
    // eslint-disable-next-line no-console
    console.log('[socketService] message_deleted event', { messageId, conversationId, user, forEveryone });
    const me = this.getUser();

    if (forEveryone === true) {
      // ✅ DO NOT DELETE → UPDATE MESSAGE
      store.dispatch({
        type: "MESSAGE_DELETED",
        messageId,
        conversationId,
      });
    } else if (user === me.username) {
      // delete only for me
      store.dispatch({
        type: "DELETE_MESSAGE",
        messageId,
        conversationId,
      });
    }
  }
);
this.socket.on("message_deleted_permanent", ({ messageId, conversationId }) => {
  store.dispatch({
    type: "PERMANENT_DELETE",
    messageId,
    conversationId,
  });
});

    /* ================= PROJECT ASSIGNED ================= */
    this.socket.on('project_assigned', ({ projectName, assignedBy }) => {
      console.log(`🔔 [SOCKET] project_assigned received for "${projectName}" by ${assignedBy}`);
      this.pushNotification({
        icon: '📁',
        title: 'Added to a project',
        body: `${assignedBy} added you to "${projectName}"`,
        link: '/apps/todo/task-list'
      });
    });

    /* ================= GENERAL PUSH NOTIFICATION ================= */
    this.socket.on('push_notification', (data) => {
      console.log('🔔 [SOCKET] push_notification received:', data.title);
      this.pushNotification(data);
    });

    return this.socket;
  }

  /* ================= DISCONNECT ================= */

  disconnect(isLogout = false) {
    if (this.socket) {
      // If intentional logout, emit logout event first so backend knows
      if (isLogout) {
        console.log('🚪 User logging out - emitting logout event');
        this.socket.emit('user_logging_out');
        // Give server time to process the event
        setTimeout(() => {
          if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
            console.log('✅ Socket fully disconnected on logout');
          }
        }, 100);
      } else {
        // DON'T disconnect on navigation or accidental disconnect
        // Socket should persist across all pages and only disconnect on logout
        console.log('ℹ️ Not disconnecting socket - will keep connected for navigation');
      }
    }
  }

  /* ================= ROOMS ================= */

  joinRoom(roomId) {
    if (!this.socket) return;

    if (this.isConnected) {
      this.socket.emit("join", roomId);
    } else {
      this.pendingRoom = roomId;
    }
  }

  leaveRoom(roomId) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("leave", roomId);
  }

  /* ================= NOTIFICATIONS ================= */
  
  // Push notification with fallback queue system
  pushNotification(notification) {
    if (typeof window._pushNotification === 'function') {
      // Notification handler is available - use it
      window._pushNotification(notification);
    } else {
      // Handler not available yet - queue the notification
      notificationQueue.push(notification);
      console.warn('⚠️ Notification queued (handler not ready):', notification.title);
    }
  }

  // Process queued notifications when handler becomes available
  processNotificationQueue() {
    if (typeof window._pushNotification !== 'function') return;
    
    while (notificationQueue.length > 0) {
      const notification = notificationQueue.shift();
      try {
        window._pushNotification(notification);
      } catch (err) {
        console.error('❌ Error processing queued notification:', err);
      }
    }
  }

  /* ================= EVENTS ================= */

  emit(event, data) {
    this.socket?.emit(event, data);
  }

  on(event, cb) {
    this.socket?.on(event, cb);
  }

  off(event, cb) {
    this.socket?.off(event, cb);
  }

  /* ================= HELPERS ================= */

 confirmDelivery(messageId, conversationId) {
  const user = this.getUser();

  console.log('📦 confirmDelivery emitting:', {
    messageId,
    conversationId,
    deliveredTo: user.username
  });

  this.emit("message_delivered", {
    messageId,
    conversationId,
    deliveredTo: user.username
  });
}


  confirmSeen(messageIds, conversationId) {
    debugger_.log('MESSAGE', '👁️ CONFIRM_SEEN - Marking messages as seen', {
      conversationId,
      messageIdCount: messageIds?.length,
      messageIds: messageIds?.map(id => id?.toString().slice(-6)),
      socketConnected: this.socket?.connected
    });

    if (!conversationId || !messageIds?.length) {
      debugger_.logWarning('socketService/confirmSeen', 'Missing required params', {
        conversationId: !!conversationId,
        messageIds: !!messageIds?.length
      });
      return;
    }

    // Ensure socket is connected before emitting
    if (!this.socket?.connected) {
      console.warn('⚠️ CONFIRM_SEEN: Socket not connected, queuing event');
      // Wait for socket to connect then emit
      setTimeout(() => this.confirmSeen(messageIds, conversationId), 100);
      return;
    }

    this.socket.emit("message_seen", {
      conversationId,
      messageIds
    }, (ack) => {
      debugger_.log('MESSAGE', '✅ Server acknowledged message_seen', { conversationId, ack });
    });

    debugger_.log('MESSAGE', '✅ Emitted message_seen event', { conversationId });
  }
}

export { notificationQueue };
export default new SocketService();