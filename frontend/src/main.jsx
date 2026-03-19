import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import store from './redux/store';
import {
  checkAuthStatus,
  updateUserOnlineStatus,
  loadConversations
} from './redux/action/Chat';

/* ✅ SUPPRESS VERBOSE LOGS BY DEFAULT */
(() => {
  const originalLog = console.log;
  const originalInfo = console.info;
  const verboseMode = localStorage.getItem('VERBOSE_LOGS') === 'true';
  
  if (!verboseMode) {
    // Suppress console.log by default (nice terminal output)
    console.log = () => {};
    console.info = () => {};
  } else {
    // Keep original if verbose is enabled
    console.log('📢 VERBOSE LOGS ENABLED - Type: localStorage.setItem("VERBOSE_LOGS", "false") to disable');
  }
  
  // Always keep error and warning
  // console.error and console.warn are not modified
})();

// SCSS - Main stylesheet
import './styles/scss/style.scss';
import { ThemeProvider } from './utils/theme-provider/theme-provider.jsx';
import socketService from './utils/socketService.js';
import debugger_ from './utils/debugger.js';

import {
  SET_INCOMING_CALL,
  CLEAR_INCOMING_CALL,
  CALL_ACCEPTED_BY_RECIPIENT,
  CALL_DECLINED_BY_RECIPIENT,
  CALL_ENDED
} from './redux/constants/Chat';

/* ================= NOTIFICATIONS ================= */
function showDesktopNotification(message) {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return;

  const title = message.senderName || 'New message';
  const body = message.text || '';

  const trigger = () => {
    try {
      new Notification(title, { body });
    } catch (err) {
      console.error('Notification error:', err);
    }
  };

  if (Notification.permission === 'granted') {
    trigger();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') trigger();
    });
  }
}

/* ================= INIT ================= */

// request notification permission
if (typeof window !== 'undefined') {
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

// check auth
store.dispatch(checkAuthStatus());


// Register socket listeners after connection
function registerSocketListeners() {
  // ✅ DISABLED: receive_message now handled in socketService.js
  // socketService.on("receive_message", (message) => { ... });

  // ✅ MESSAGE DELIVERED - Update deliveredTo array
  socketService.on("message_delivered", ({ messageId, conversationId, deliveredTo }) => {
    if (!messageId || !conversationId) {
      console.warn('⚠️ message_delivered missing required fields:', { messageId, conversationId });
      return;
    }
    
    debugger_.verbose_log('📦 Socket received message_delivered:', { messageId, conversationId, deliveredTo });
    
    const action = {
      type: 'UPDATE_MESSAGE_DELIVERED',
      conversationId,
      messageId,
      deliveredTo: deliveredTo || 'delivered'
    };
    
    debugger_.verbose_log('📤 Dispatching UPDATE_MESSAGE_DELIVERED:', action);
    store.dispatch(action);
    
    // Verify state was updated
    setTimeout(() => {
      const state = store.getState();
      const msgs = state.chatReducer.messages[conversationId] || [];
      const updated = msgs.find(m => String(m._id) === String(messageId));
      debugger_.verbose_log('✅ Redux state after UPDATE_MESSAGE_DELIVERED:', { messageId, deliveredTo: updated?.deliveredTo });
    }, 100);
  });

  // ✅ MESSAGE SEEN - Update seenBy array for all sent messages
  socketService.on("messages_seen", ({ conversationId, seenBy }) => {
    debugger_.log('MESSAGE', '👁️ messages_seen event received', { conversationId, seenBy });
    
    if (!conversationId || !seenBy) {
      console.warn('⚠️ Missing required fields in messages_seen:', { conversationId, seenBy });
      return;
    }
    
    const state = store.getState();
    const msgs = state.chatReducer.messages[conversationId] || [];
    debugger_.log('MESSAGE', 'Processing seen update', { 
      conversationId, 
      seenByUser: seenBy,
      totalMessagesInConv: msgs.length,
      sentMessagesInConv: msgs.filter(m => m.types === 'sent').length
    });
    
    const action = {
      type: 'BULK_UPDATE_SEEN',
      conversationId,
      seenBy
    };
    
    store.dispatch(action);
    
    // Verify state was updated immediately
    const newState = store.getState();
    const newMsgs = newState.chatReducer.messages[conversationId] || [];
    const seenCount = newMsgs.filter(m => m.types === 'sent' && m.seenBy?.includes(seenBy)).length;
    debugger_.log('MESSAGE', '✅ State updated after BULK_UPDATE_SEEN', { 
      conversationId, 
      seenByUser: seenBy, 
      seenMessageCount: seenCount,
      totalSentMessages: newMsgs.filter(m => m.types === 'sent').length
    });
  });

  // ✅ MESSAGE DELETED - Update message deletedFor or deletedForEveryone
  socketService.on("message_deleted", ({ messageId, conversationId, forEveryone, user }) => {
    debugger_.log('MESSAGE', '🗑️ message_deleted event received', { messageId: messageId?.toString().slice(-6), conversationId, forEveryone, user });

    if (!messageId || !conversationId) {
      console.warn('⚠️ message_deleted missing required fields:', { messageId, conversationId });
      return;
    }

    const action = forEveryone 
      ? {
          type: 'MESSAGE_DELETED',
          conversationId,
          messageId
        }
      : {
          type: 'DELETE_MESSAGE',
          messageId,
          conversationId,
          forEveryone: false
        };

    debugger_.log('MESSAGE', '📤 Dispatching delete action', { type: action.type, conversationId, messageId: messageId?.toString().slice(-6) });
    store.dispatch(action);
  });

  // ✅ SOCKET RECONNECT - Re-fetch conversations to get latest online status
  socketService.on('connect', () => {
    console.log('🔌 Socket connected/reconnected - refreshing presence');
    store.dispatch(loadConversations());
  });

  socketService.on('disconnect', () => {
    console.log('🔌 Socket disconnected');
  });

  /* ================= CALL EVENTS ================= */

  socketService.on('initiate_call', (data) => {
    const state = store.getState();
    const currentUserId = state.chatReducer.userId;

    if (data.to === currentUserId) {
      store.dispatch({
        type: SET_INCOMING_CALL,
        callData: data
      });
    }
  });

  socketService.on('call_accepted', (data) => {
    const state = store.getState();
    const currentUserId = state.chatReducer.userId;

    if (data.to === currentUserId) {
      store.dispatch({ type: CLEAR_INCOMING_CALL });
    } else if (data.from === currentUserId) {
      store.dispatch({
        type: CALL_ACCEPTED_BY_RECIPIENT,
        recipientUserId: data.to
      });
    }
  });

  socketService.on('call_declined', (data) => {
    const state = store.getState();
    const currentUserId = state.chatReducer.userId;

    if (data.to === currentUserId) {
      store.dispatch({ type: CLEAR_INCOMING_CALL });
    } else if (data.from === currentUserId) {
      store.dispatch({
        type: CALL_DECLINED_BY_RECIPIENT,
        recipientUserId: data.to
      });
    }
  });

  socketService.on('call_ended', (data) => {
    const state = store.getState();
    const currentUserId = state.chatReducer.userId;

    if (data.to === currentUserId || data.from === currentUserId) {
      store.dispatch({ type: CALL_ENDED });
    }
  });
}

// connect socket if token exists and register listeners after connect
const token = localStorage.getItem('accessToken');
if (token) {
  const socket = socketService.connect();
  
  // Register listeners - socketService now manages these
  registerSocketListeners();
}

/* ================= RENDER ================= */

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);