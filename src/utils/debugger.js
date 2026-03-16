class ChatDebugger {
  constructor() {
    this.enabled = this.isEnabled();
    this.logs = [];
    this.maxLogs = 100;
    this.filters = new Set(['REDUX', 'SOCKET', 'MESSAGE', 'COMPONENT', 'STATE', 'ERROR']);
    this.verbose = localStorage.getItem('VERBOSE_LOGS') === 'true'; // Verbose console output
  }

  isEnabled() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('DEBUG_CHAT') === 'true';
  }

  toggle() {
    const newState = !this.enabled;
    this.enabled = newState;
    localStorage.setItem('DEBUG_CHAT', newState ? 'true' : 'false');
    console.log(`🐛 Chat Debugger ${newState ? 'ENABLED' : 'DISABLED'}`);
    return newState;
  }

  // ✅ Verbose logging - suppressed by default, enable with: localStorage.setItem('VERBOSE_LOGS', 'true')
  verbose_log(...args) {
    if (this.verbose) console.log(...args);
  }

  verbose_info(...args) {
    if (this.verbose) console.info(...args);
  }

  verbose_warn(...args) {
    if (this.verbose) console.warn(...args);
  }

  log(category, title, data = {}) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      timestamp,
      category,
      title,
      data,
      stackTrace: this.getStackTrace()
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const style = this.getStyleForCategory(category);
    console.log(
      `%c[${timestamp}] ${category} → ${title}`,
      style,
      data
    );
  }

  getStyleForCategory(category) {
    const styles = {
      REDUX: 'color: #764FA2; font-weight: bold; background: #f0e6ff; padding: 2px 6px; border-radius: 3px;',
      SOCKET: 'color: #0066cc; font-weight: bold; background: #e6f2ff; padding: 2px 6px; border-radius: 3px;',
      MESSAGE: 'color: #009900; font-weight: bold; background: #e6ffe6; padding: 2px 6px; border-radius: 3px;',
      COMPONENT: 'color: #ff6600; font-weight: bold; background: #ffe6cc; padding: 2px 6px; border-radius: 3px;',
      STATE: 'color: #990000; font-weight: bold; background: #ffe6e6; padding: 2px 6px; border-radius: 3px;',
      ERROR: 'color: #cc0000; font-weight: bold; background: #ffcccc; padding: 2px 6px; border-radius: 3px;'
    };
    return styles[category] || 'color: #666; padding: 2px 6px;';
  }

  getStackTrace() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n').slice(3, 6);
      return lines.map(line => line.trim()).join(' > ');
    } catch (e) {
      return '';
    }
  }

  // ===== REDUX LOGGING =====
  logReduxAction(actionType, payload, state) {
    this.log('REDUX', `Action: ${actionType}`, {
      payload,
      stateSummary: this.summarizeState(state)
    });
  }

  logReduxStateChange(reducer, prevState, newState, action) {
    this.log('REDUX', `State Changed in ${reducer}`, {
      action: action.type,
      prevStateSummary: this.summarizeState(prevState),
      newStateSummary: this.summarizeState(newState),
      stateChanged: JSON.stringify(prevState) !== JSON.stringify(newState)
    });
  }

  // ===== SOCKET LOGGING =====
  logSocketEvent(eventName, data) {
    this.log('SOCKET', `Event: ${eventName}`, data);
  }

  logSocketEmit(eventName, data) {
    this.log('SOCKET', `Emit: ${eventName}`, data);
  }

  logSocketConnection(status, info) {
    this.log('SOCKET', `Connection: ${status}`, info);
  }

  // ===== MESSAGE LOGGING =====
  logMessageAction(action, messageId, details) {
    this.log('MESSAGE', `${action}: ${messageId}`, details);
  }

  logMessageSent(message) {
    this.log('MESSAGE', `Sent [${message._id}]`, {
      conversationId: message.conversationId,
      text: message.text?.slice(0, 50),
      replyTo: message.replyTo,
      sender: message.senderId
    });
  }

  logMessageReceived(message) {
    this.log('MESSAGE', `Received [${message._id}]`, {
      conversationId: message.conversationId,
      text: message.text?.slice(0, 50),
      sender: message.senderId,
      timestamp: message.timestamp
    });
  }

  logMessageDelete(messageId, conversationId, scope) {
    this.log('MESSAGE', `Delete [${messageId}]: ${scope}`, {
      conversationId
    });
  }

  // ===== COMPONENT LOGGING =====
  logComponentMount(componentName, props) {
    this.log('COMPONENT', `Mount: ${componentName}`, {
      propsKeys: Object.keys(props || {})
    });
  }

  logComponentUpdate(componentName, changes) {
    this.log('COMPONENT', `Update: ${componentName}`, changes);
  }

  logComponentUnmount(componentName) {
    this.log('COMPONENT', `Unmount: ${componentName}`, {});
  }

  // ===== STATE LOGGING =====
  logReplyState(replyingTo, action) {
    this.log('STATE', `Reply State [${action}]`, {
      replyingTo: replyingTo ? this.summarizeMessage(replyingTo) : null
    });
  }

  logConversationState(conversationId, messageCount) {
    this.log('STATE', `Conversation [${conversationId}]`, {
      messageCount
    });
  }

  // ===== ERROR LOGGING =====
  logError(location, error, context = {}) {
    this.log('ERROR', `Error in ${location}`, {
      message: error?.message || String(error),
      context
    });
  }

  logWarning(location, message, context = {}) {
    console.warn(`⚠️ [${location}] ${message}`, context);
    this.log('ERROR', `Warning: ${location}`, {
      message,
      context
    });
  }

  // ===== HELPER METHODS =====
  summarizeState(state) {
    if (!state) return null;
    return {
      messageCount: Object.keys(state.messages || {}).length,
      conversationCount: (state.conversations || []).length,
      replyingTo: state.replyingTo ? 'Set' : 'Null',
      currentChat: state.currentChat
    };
  }

  summarizeMessage(message) {
    return {
      _id: message._id,
      sender: message.senderId,
      text: message.text?.slice(0, 30),
      replyTo: message.replyTo
    };
  }

  // ===== DISPLAY LOGS =====
  displayLogs(filter = null) {
    console.clear();
    const filteredLogs = filter
      ? this.logs.filter(log => log.category === filter)
      : this.logs;

    console.table(filteredLogs.map(log => ({
      Time: log.timestamp,
      Category: log.category,
      Title: log.title,
      DataKeys: Object.keys(log.data).join(', ')
    })));

    return filteredLogs;
  }

  getAllLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Debug logs cleared');
  }

  // ===== EXPORT/IMPORT =====
  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-debug-${new Date().getTime()}.json`;
    a.click();
    console.log('📥 Debug logs exported');
  }

  // ===== PERFORMANCE =====
  logPerformance(label, duration) {
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
  }
}

// Create singleton instance
const debugger_ = new ChatDebugger();

// Make available globally for easy access in console
if (typeof window !== 'undefined') {
  window.chatDebugger = debugger_;
  window.toggleDebug = () => debugger_.toggle();
  window.showDebugLogs = (filter) => debugger_.displayLogs(filter);
  window.clearDebugLogs = () => debugger_.clearLogs();
  window.exportDebugLogs = () => debugger_.exportLogs();
}

export default debugger_;
