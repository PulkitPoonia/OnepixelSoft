const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

import socketService from '../../utils/socketService';
import debugger_ from '../../utils/debugger';
import {
  CONTACT_MSG,
  GROUP_MSG,
  REPLY_MSG,
  SENT_MSG,
  SET_USER,
  START_CHATING,
  LOAD_MESSAGES,
  LOAD_CONVERSATIONS,
  SET_CURRENT_CONVERSATION,
  UPDATE_PRESENCE,
  UPDATE_MESSAGE_STATUS,
  UPDATE_USER_ONLINE_STATUS,
  CLEAR_UNREAD,
  SET_REPLY,
  CLEAR_REPLY
} from "../constants/Chat";

/* ================= TOKEN ================= */

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

/* ================= LOAD MESSAGES ================= */

export function loadMessages(conversationId, limit = 30, skip = 0) {
  return async (dispatch) => {

    const token = getToken();
    if (!token) {
      console.warn("loadMessages: No token found");
      return;
    }

    try {
      // ✅ FIX: Add pagination parameters
      const url = new URL(`${API_BASE}/api/chat/${conversationId}/messages`);
      url.searchParams.set('limit', limit);
      url.searchParams.set('skip', skip);

      const res = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        console.error(`loadMessages: API error ${res.status}`, res.statusText);
        return;
      }

      const data = await res.json();

      if (data.ok) {
        const msgCount = data.messages?.length || 0;
        debugger_.verbose_log('📬 Loaded', msgCount, "messages for", conversationId);
        if (msgCount > 0) {
          debugger_.verbose_log('First 3 messages:', data.messages.slice(0, 3).map(m => ({
            _id: m._id,
            senderId: m.senderId,
            seenBy: m.seenBy
          })));
        }
        
        dispatch({
          type: LOAD_MESSAGES,
          conversationId,
          messages: data.messages || [],
        });

        dispatch({
          type: SET_CURRENT_CONVERSATION,
          conversationId,
        });
        socketService.joinRoom(conversationId);

        dispatch({
          type: CLEAR_UNREAD,
          conversationId,
        });

        // ✅ CRITICAL FIX: Mark loaded messages as seen and delivered when chat opens
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const unreadMessages = (data.messages || []).filter(m => 
          m.senderId !== user.username && !m.seenBy?.includes(user.username)
        );
        
        if (unreadMessages.length > 0) {
          debugger_.verbose_log('🔔 Calling confirmSeen for:', conversationId, 'with', unreadMessages.length, 'unread messages');
          
          const messageIds = unreadMessages.map(m => m._id);
          
          // Mark all received messages as delivered first
          unreadMessages.forEach(msg => {
            if (msg._id) {
              socketService.emit('message_delivered', {
                messageId: msg._id,
                conversationId: conversationId
              });
            }
          });
          
          // Then mark all unseen messages as seen - IMMEDIATELY, not with setTimeout
          socketService.confirmSeen(messageIds, conversationId);
          debugger_.verbose_log('✅ confirmSeen called with', messageIds.length, 'messages');
        } else {
          debugger_.verbose_log('✅ No unread messages to mark as seen');
        }
      } else {
        console.warn("loadMessages: Server returned ok=false", data);
      }
    } catch (err) {
      console.error("loadMessages error:", err);
    }
  };
}
/* ================= LOAD CONVERSATIONS ================= */

export function loadConversations() {
  return async (dispatch) => {

    const token = getToken();
    if (!token) {
      console.warn("loadConversations: No token found");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/chat/conversations`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        console.error(`loadConversations: API error ${res.status}`, res.statusText);
        return;
      }

      const data = await res.json();

      if (data.ok) {
        console.log("loadConversations: Loaded", data.conversations?.length || 0, "conversations");
        dispatch({
          type: LOAD_CONVERSATIONS,
          conversations: data.conversations || [],
        });
      } else {
        console.warn("loadConversations: Server returned ok=false", data);
      }
    } catch (err) {
      console.error("loadConversations error:", err);
    }
  };
}

/* ================= CREATE CONVERSATION ================= */

export function createConversation(participants) {
  return async (dispatch) => {

    const token = getToken();
    if (!token) return null; // 🚨 FIX

    try {
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ participants }),
      });

      const data = await res.json();

      if (data.ok) {
        const conversationId = data.conversationId;

        dispatch(loadConversations());

        dispatch({
          type: SET_CURRENT_CONVERSATION,
          conversationId,
        });

        return conversationId;
      }
    } catch (err) {
      console.error("createConversation error:", err);
    }

    return null;
  };
}

/* ================= SEND MESSAGE ================= */

export const sentMsg = (message) => ({
  type: SENT_MSG,
  payload: message,
});

/* ================= ACTIONS ================= */

export const setCurrentConversation = (conversationId) => ({
  type: SET_CURRENT_CONVERSATION,
  conversationId,
});

export const StartConversation = (value) => ({
  type: START_CHATING,
  payload: value,
});

export const setUser = (id, avatar, name) => ({
  type: SET_USER,
  id,
  avatar,
  name,
});

/* ================= OTHER ACTIONS ================= */

export const groupMessage = (message) => ({
  type: GROUP_MSG,
  payload: message,
});

export const replyMessage = (message) => ({
  type: REPLY_MSG,
  payload: message,
});

export const contactMessage = (message) => ({
  type: CONTACT_MSG,
  payload: message,
});

export const updateMessageStatus = (conversationId, messageId, status) => ({
  type: UPDATE_MESSAGE_STATUS,
  conversationId,
  messageId,
  status,
});

export const updateUserOnlineStatus = (userId, isOnline) => ({
  type: UPDATE_USER_ONLINE_STATUS,
  userId,
  isOnline,
});

export const updatePresence = (username, isOnline, lastSeen) => ({
  type: UPDATE_PRESENCE,
  username,
  isOnline,
  lastSeen
});

/* ================= REPLY ================= */

export const setReply = (message) => {
  debugger_.logMessageAction('Set Reply', message?._id, {
    sender: message?.senderId,
    text: message?.text?.slice(0, 50),
    conversationId: message?.conversationId
  });
  return {
    type: SET_REPLY,
    payload: message,
  };
};

export const clearReply = () => {
  debugger_.log('STATE', 'Clear Reply', { action: 'CLEAR_REPLY' });
  return {
    type: CLEAR_REPLY,
  };
};

export const clearUnread = (conversationId) => ({
  type: CLEAR_UNREAD,
  conversationId,
});

/* ================= AUTH ================= */

export const checkAuthStatus = () => {
  return (dispatch) => {
    const user = localStorage.getItem("user");

    if (!user) return;

    let parsed;

    try {
      parsed = JSON.parse(user);
    } catch (err) {
      console.error("Invalid user JSON");
      return;
    }

    if (!parsed || !parsed._id) return;

    dispatch(
      setUser(
        parsed._id,
        parsed.profilePic || "",
        parsed.name || parsed.username
      )
    );
  };
};

/* ================= LOGOUT ================= */

export function logoutUser() {
  return (dispatch) => {
    // ✅ Disconnect socket with logout flag
    console.log('🔌 Redux logout - disconnecting socket with logout event');
    socketService.disconnect(true); // Pass true to indicate intentional logout
    
    localStorage.removeItem("accessToken");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    dispatch(setUser("", "", ""));
  };
}

/* ================= SYNC MESSAGES ON RECONNECT ================= */

export function syncMessagesOnReconnect() {
  return async (dispatch, getState) => {
    const token = getToken();
    if (!token) {
      console.warn("syncMessagesOnReconnect: No token found");
      return;
    }

    try {
      console.log('\n🔄 ==== SYNC MESSAGES ON RECONNECT START ====');
      
      // Get current state
      const state = getState();
      const currentConversationId = state.chatReducer?.currentConversationId;
      const conversations = state.chatReducer?.conversations || [];

      if (conversations.length === 0) {
        console.log('❌ No conversations to sync');
        return;
      }

      console.log('📦 Syncing', conversations.length, 'conversations');

      // ✅ OPTIMIZATION: Only fetch messages for conversations with unread messages
      const conversationsWithUnread = conversations.filter(c => c.unreadCount > 0);
      
      if (conversationsWithUnread.length === 0) {
        console.log('✅ No unread messages to sync');
        // Still reload conversations for fresh state
        await new Promise(resolve => setTimeout(resolve, 200));
        dispatch(loadConversations());
        return;
      }

      console.log('📨 Found', conversationsWithUnread.length, 'conversations with unread messages');

      // ✅ OPTIMIZATION: Make all API calls in parallel instead of sequential
      const fetchPromises = conversationsWithUnread.map(conversation => {
        const conversationId = conversation._id;
        const unreadCount = conversation.unreadCount || 0;

        console.log('📨 Fetching', unreadCount, 'unread messages from conversation:', conversationId);

        // Fetch only the unread messages (with a small buffer)
        return fetch(
          `${API_BASE}/api/chat/${conversationId}/messages?limit=${Math.min(unreadCount + 5, 100)}&skip=0`,
          {
            headers: getAuthHeaders(),
          }
        )
          .then(res => res.json())
          .then(data => ({ conversationId, data }))
          .catch(err => {
            console.error('❌ Failed to fetch messages from', conversationId, ':', err);
            return { conversationId, data: null };
          });
      });

      // Wait for all fetches to complete
      const results = await Promise.all(fetchPromises);

      // Process results
      const me = JSON.parse(localStorage.getItem('user') || '{}');
      const myUsername = me.username;
      let totalMessagesProcessed = 0;

      results.forEach(({ conversationId, data }) => {
        if (!data?.ok || !data?.messages) {
          console.error('❌ Bad response from conversation:', conversationId);
          return;
        }

        const messages = data.messages;

        // ✅ OPTIMIZATION: Only dispatch messages that are actually unseen
        messages.forEach((msg) => {
          // Skip if already seen or deleted for me
          if (msg.seenBy?.includes(myUsername) || msg.deletedFor?.includes(myUsername)) {
            return;
          }

          // Dispatch message to Redux
          const payload = {
            ...msg,
            types: msg.senderId === myUsername ? "sent" : "received",
            seenBy: Array.isArray(msg.seenBy) ? msg.seenBy : [],
            deliveredTo: Array.isArray(msg.deliveredTo) ? msg.deliveredTo : [],
          };

          console.log('📨 Syncing message:', { id: msg._id, from: msg.senderId });
          dispatch({
            type: "SENT_MSG",
            payload,
          });
          totalMessagesProcessed++;
        });

        // ✅ OPTIMIZATION: Batch delivery for all unread messages for this conversation
        if (messages.length > 0) {
          const unreadMessages = messages.filter(
            m => m.senderId !== myUsername && !m.deliveredTo?.includes(myUsername)
          );
          
          // Send delivery status for all undelivered messages
          if (unreadMessages.length > 0) {
            console.log('📦 Marking', unreadMessages.length, 'messages as delivered for:', conversationId);
            unreadMessages.forEach((msg) => {
              socketService.confirmDelivery(msg._id, conversationId);
            });
          }

          // Only mark as SEEN if this is the currently open conversation
          if (currentConversationId === conversationId) {
            console.log('👁 Current conversation open - marking as seen for:', conversationId);
            socketService.emit('message_seen', { conversationId });
          }
        }
      });

      console.log('✅ Synced', totalMessagesProcessed, 'messages from', conversationsWithUnread.length, 'conversations');
      console.log('🔄 Reloading conversations for fresh unread counts');
      
      // Small delay to let messages settle in Redux before reloading
      await new Promise(resolve => setTimeout(resolve, 200));
      dispatch(loadConversations());

      console.log('✅ ==== SYNC MESSAGES ON RECONNECT END ====\n');

    } catch (err) {
      console.error("❌ syncMessagesOnReconnect error:", err);
    }
  };
}
