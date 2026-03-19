import {
    START_CHATING,
    SENT_MSG,
    LOAD_MESSAGES,
    LOAD_CONVERSATIONS,
    LOAD_ALL_USERS,
    ADD_CONVERSATION,
    SET_CURRENT_CONVERSATION,
    UPDATE_PRESENCE,
    DELETE_MESSAGE,
    CLEAR_UNREAD,
    UPDATE_MESSAGE_STATUS
} from "../constants/Chat";
import debugger_ from '../../utils/debugger';

const initialState = {
    startChating: false,
    avatar: '',
    userId: '',
    userName: '',
    isOnline: false,
    lastSeen: null,
    conversations: [],
    allUsers: [],
    currentConversationId: null,
    messages: {},
    replyingTo: null,
};

const ChatReducer = (state = initialState, action) => {

    const safeConversations = Array.isArray(state.conversations)
        ? state.conversations.filter(c => c && (c._id || c.conversationId))
        : [];

    switch (action.type) {

        /* ================= SEND / RECEIVE ================= */
        case SENT_MSG: {
            const msg = action.payload;
            if (!msg || !msg.conversationId) {
                debugger_.logWarning('ChatReducer/SENT_MSG', 'Missing message or conversationId', { msg });
                return state;
            }

            console.log('🔴 ---- SENT_MSG REDUCER START ----');
            console.log('Message details:', {
                msgId: msg._id?.toString().slice(-6),
                conversationId: msg.conversationId,
                types: msg.types,
                senderId: msg.senderId,
                currentConversationId: state.currentConversationId
            });

            const me = JSON.parse(localStorage.getItem("user") || "{}");

const shouldIncrement =
  msg.senderId !== me.username &&
  String(state.currentConversationId) !== String(msg.conversationId);
            console.log('Should increment count?', {
                isReceived: msg.types === 'received',
                notCurrentConv: state.currentConversationId !== msg.conversationId,
                shouldIncrement
            });

            const existing = state.messages[msg.conversationId] || [];

       
            const messageIds = new Set(existing.map(m => String(m._id)));
            if (messageIds.has(String(msg._id))) {
                console.error('❌❌❌ RED ALERT: DUPLICATE MESSAGE IN REDUCER', { 
                  msgId: msg._id?.toString().slice(-6),
                  conversationId: msg.conversationId,
                  senderId: msg.senderId,
                  types: msg.types,
                  existingCount: existing.length,
                  shouldHaveBeenFilteredAtSocket: 'YES'
                });
                // This should NOT happen - duplicates should be filtered at socket listener level
                return state;
            }

         const updatedMessages = [...existing, {
    ...msg,
    reactions: msg.reactions || {},
    seenBy: Array.isArray(msg.seenBy) ? msg.seenBy : [],
    deliveredTo: Array.isArray(msg.deliveredTo) ? msg.deliveredTo : [],
    replyTo: msg.replyTo || null,
    replyToMessage: msg.replyToMessage || null
}];

           
        let updatedConversations = [...safeConversations];

        const index = updatedConversations.findIndex(
          c => String(c._id || c.conversationId) === String(msg.conversationId)
        );

        console.log('🔎 SENT_MSG - Finding conversation:', {
          conversationId: msg.conversationId,
          foundIndex: index,
          hasConversationData: !!msg.conversationData,
          conversationDataKeys: msg.conversationData ? Object.keys(msg.conversationData) : null,
          shouldIncrement
        });

        if (index !== -1) {
          // ✅ Conversation exists - update it
          const conv = updatedConversations[index];

          const updatedConv = {
            ...conv,
            lastMessage: msg,
            messageCount: shouldIncrement
              ? (conv.messageCount || 0) + 1
              : (conv.messageCount || 0)
          };

          console.log('✅ SENT_MSG: Updated existing conversation:', {
            convId: msg.conversationId?.toString?.().slice?.(-6),
            convType: conv.isGroup ? 'GROUP' : '1-ON-1',
            groupName: conv.groupName,
            prevCount: conv.messageCount,
            newCount: updatedConv.messageCount,
            shouldIncrement,
            senderId: msg.senderId?.slice?.(-6),
            meUsername: msg.senderId === me.username ? 'MINE' : 'OTHER',
            currentConvId: state.currentConversationId?.toString?.().slice?.(-6),
            isCurrentConv: String(state.currentConversationId) === String(msg.conversationId)
          });

          updatedConversations.splice(index, 1);
          updatedConversations.unshift(updatedConv);
        } else if (shouldIncrement && msg.conversationData) {
          // ✅ Conversation doesn't exist yet - create it from data sent by backend
          console.log('🆕 Creating NEW conversation from message:', {
            conversationId: msg.conversationId,
            hasParticipants: !!msg.conversationData.participants,
            participantsCount: msg.conversationData.participants?.length
          });
          
          const newConversation = {
            ...msg.conversationData,
            messageCount: 1, // New conversation with unread message
            lastMessage: msg
          };
          
          updatedConversations.unshift(newConversation);
          console.log('✅ New conversation added. Total conversations:', updatedConversations.length);
        } else {
          console.log('⚠️ SENT_MSG - Skipping conversation update:', {
            reason: !shouldIncrement ? 'Not a received message for other conversation' : 'Missing conversationData',
            shouldIncrement,
            hasConversationData: !!msg.conversationData
          });
        }

            debugger_.logConversationState(msg.conversationId, updatedMessages.length);

            return {
                ...state,
                conversations: updatedConversations,
                messages: {
                    ...state.messages,
                    [msg.conversationId]: updatedMessages
                }
            };
        }

        /* ================= LOAD ================= */
        case LOAD_MESSAGES: {
            const user = JSON.parse(localStorage.getItem("user") || '{}');

            const processed = (action.messages || [])
                .filter(m => m && m._id)
                .map(m => ({
                    ...m,
                    reactions: m.reactions || {},
                   replyTo: m.replyTo || null,
                    replyToMessage: m.replyToMessage || null,
                    seenBy: Array.isArray(m.seenBy) ? m.seenBy : [],
                    deliveredTo: Array.isArray(m.deliveredTo) ? m.deliveredTo : [],
                    types: m.senderId === user.username ? 'sent' : 'received'
                }));

            return {
                ...state,
                currentConversationId: action.conversationId,
                messages: {
                    ...state.messages,
                    [action.conversationId]: processed
                }
            };
        }

        /* ================= UPDATE STATUS ================= */
        case UPDATE_MESSAGE_STATUS: {
            const { conversationId, messageId, status } = action;

            const msgs = state.messages[conversationId] || [];

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.map(m => {
                        if (String(m._id) === String(messageId)) {
                            const updated = { ...m, status };
                           
                            if (status === 'seen' && !Array.isArray(m.seenBy)) {
                                updated.seenBy = [];
                            }
                            if (status === 'delivered' && !Array.isArray(m.deliveredTo)) {
                                updated.deliveredTo = [];
                            }
                            return updated;
                        }
                        return m;
                    })
                }
            };
        }

        /* ================= UPDATE SINGLE MESSAGE (REAL-TIME) ================= */
        case "UPDATE_SINGLE_MESSAGE": {
            const { message, conversationId } = action;
            if (!message || !conversationId) return state;
            const msgs = state.messages[conversationId] || [];
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: msgs.map(m =>
                        String(m._id) === String(message._id)
                            ? { ...m, ...message }
                            : m
                    )
                }
            };
        }
        /* ================= SOCKET SEEN UPDATE ================= */
case "MESSAGES_SEEN": {
    const { conversationId, seenBy } = action;

    const msgs = state.messages[conversationId] || [];

    console.log("👁 REDUCER MESSAGES_SEEN:", {
        conversationId,
        seenBy,
        messageCount: msgs.length
    });

    const updated = msgs.map(m => {
        if (m.types !== "sent") return m;

        const seen = Array.isArray(m.seenBy) ? [...m.seenBy] : [];

        if (!seen.includes(seenBy)) {
            seen.push(seenBy);
        }

        return { ...m, seenBy: seen };
    });

    return {
        ...state,
        messages: {
            ...state.messages,
            [conversationId]: updated
        }
    };
}

        /* ================= BULK UPDATE SEEN BY ================= */
        case "BULK_UPDATE_SEEN": {
            const { conversationId, seenBy } = action;
            const msgs = state.messages[conversationId] || [];

            debugger_.log('MESSAGE', '👁️ REDUCER: BULK_UPDATE_SEEN START', { 
                conversationId, 
                seenBy, 
                msgCount: msgs.length,
                sentMsgCount: msgs.filter(m => m.types === 'sent').length
            });

            const updated = msgs.map(m => {
                if (m.types !== 'sent') return m;
                
                const updatedSeenBy = Array.isArray(m.seenBy) ? [...m.seenBy] : [];
                const alreadySeen = updatedSeenBy.includes(seenBy);
                if (!alreadySeen) {
                    updatedSeenBy.push(seenBy);
                    debugger_.log('MESSAGE', '✅ Marked message as seen:', { 
                      messageId: m._id?.toString().slice(-6), 
                      seenBy: updatedSeenBy,
                      conversationId 
                    });
                }
                return { ...m, seenBy: updatedSeenBy };
            });

            const result = {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: updated
                },
             
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(conversationId)) {
                   
                        const lastMsg = updated[updated.length - 1];
                        return {
                            ...conv,
                            lastMessage: lastMsg || conv.lastMessage,
                            messageCount: 0
                        };
                    }
                    return conv;
                })
            };

            debugger_.log('MESSAGE', '✅ REDUCER: BULK_UPDATE_SEEN COMPLETE', {
                conversationId,
                updatedMessageCount: updated.length,
                seenByUser: seenBy
            });

            return result;
        }

        /* ================= UPDATE MESSAGE DELIVERED ================= */
        case "UPDATE_MESSAGE_DELIVERED": {
            const { conversationId, messageId, deliveredTo } = action;
            const msgs = state.messages[conversationId] || [];

            console.log('📦 REDUCER: UPDATE_MESSAGE_DELIVERED START', { 
                conversationId, 
                messageId, 
                deliveredTo, 
                msgCount: msgs.length,
                messageExists: msgs.some(m => String(m._id) === String(messageId))
            });

            const updated = msgs.map(m => {
                if (String(m._id) === String(messageId)) {
                    const revised = { ...m };
                    if (!Array.isArray(revised.deliveredTo)) {
                        revised.deliveredTo = [];
                    }
                    if (!revised.deliveredTo.includes(deliveredTo)) {
                        revised.deliveredTo.push(deliveredTo);
                    }
                    console.log('✅ Updated message:', { messageId, deliveredTo: revised.deliveredTo });
                    return revised;
                }
                return m;
            });

            const result = {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: updated
                },
             
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(conversationId)) {
                     
                        const lastMsg = updated[updated.length - 1];
                        return {
                            ...conv,
                            lastMessage: lastMsg || conv.lastMessage
                        };
                    }
                    return conv;
                })
            };

            console.log('✅ REDUCER: UPDATE_MESSAGE_DELIVERED DONE', {
                newLength: updated.length,
                oldLength: msgs.length,
                changed: updated !== msgs
            });

            return result;
        }

        /* ================= ❤️ REACTION ================= */
        case "ADD_REACTION": {
            const { conversationId, messageId, emoji, userId } = action;

            const msgs = state.messages[conversationId] || [];

            const updated = msgs.map(m => {
                if (String(m._id) !== String(messageId)) return m;

                const reactions = { ...(m.reactions || {}) };

                if (!reactions[emoji]) reactions[emoji] = [];

                if (reactions[emoji].includes(userId)) {
                    reactions[emoji] = reactions[emoji].filter(u => u !== userId);
                } else {
                    reactions[emoji].push(userId);
                }

                return { ...m, reactions };
            });

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: updated
                },
              
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(conversationId)) {
                     
                        const lastMsg = updated[updated.length - 1];
                        return {
                            ...conv,
                            lastMessage: lastMsg || conv.lastMessage
                        };
                    }
                    return conv;
                })
            };
        }

        /* ================= ↩️ REPLY ================= */
        case "SET_REPLY": {
            debugger_.logReplyState(action.payload, 'SET_REPLY');
            return {
                ...state,
                replyingTo: action.payload
            };
        }

        case "CLEAR_REPLY": {
            debugger_.logReplyState(null, 'CLEAR_REPLY');
            return {
                ...state,
                replyingTo: null
            };
        }

        /* ================= DELETE ================= */
        case DELETE_MESSAGE: {
            const convId = action.conversationId || state.currentConversationId;
            if (!convId) return state;

            if (action.forEveryone) {
                const updatedMsgs = (state.messages[convId] || []).filter(
                    m => String(m._id) !== String(action.messageId)
                );
                return {
                    ...state,
                    messages: {
                        ...state.messages,
                        [convId]: updatedMsgs
                    },
               
                    conversations: safeConversations.map(conv => {
                        const id = conv._id || conv.conversationId;
                        if (String(id) === String(convId)) {
                            const lastMsg = updatedMsgs[updatedMsgs.length - 1];
                            return {
                                ...conv,
                                lastMessage: lastMsg || conv.lastMessage
                            };
                        }
                        return conv;
                    })
                };
            }

            const user = JSON.parse(localStorage.getItem("user") || '{}');
            const updatedMsgs = (state.messages[convId] || []).map(m => {
                if (String(m._id) === String(action.messageId)) {
                    const deletedFor = Array.isArray(m.deletedFor) ? [...m.deletedFor] : [];
                    if (!deletedFor.includes(user.username)) {
                        deletedFor.push(user.username);
                    }
                    return { ...m, deletedFor };
                }
                return m;
            });

            const lastVisibleMsg = updatedMsgs.reverse().find(m => {
                const deletedForArr = Array.isArray(m.deletedFor) ? m.deletedFor : [];
                return !deletedForArr.includes(user.username);
            });
            updatedMsgs.reverse(); 

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [convId]: updatedMsgs
                },
               
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(convId)) {
                        return {
                            ...conv,
                            lastMessage: lastVisibleMsg || conv.lastMessage
                        };
                    }
                    return conv;
                })
            };
        }

        /* ================= ✅ NEW FIX ================= */
        case "MESSAGE_DELETED": {
            const { conversationId, messageId } = action;

            debugger_.log('MESSAGE', 'Processing MESSAGE_DELETED (forEveryone)', {
              conversationId,
              messageId: messageId?.toString().slice(-6)
            });

            const msgs = state.messages[conversationId] || [];

            const updatedMsgs = msgs.map(m =>
                String(m._id) === String(messageId)
                    ? {
                        ...m,
                        deletedForEveryone: true,
                        text: ""
                    }
                    : m
            );

            debugger_.log('MESSAGE', '✅ MESSAGE_DELETED complete', {
              conversationId,
              messageId: messageId?.toString().slice(-6),
              messagesInConv: updatedMsgs.length
            });

            return {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: updatedMsgs
                },
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(conversationId)) {
                      
                        const lastMsg = updatedMsgs[updatedMsgs.length - 1];
                        return {
                            ...conv,
                            lastMessage: lastMsg || conv.lastMessage
                        };
                    }
                    return conv;
                })
            };
        }

        /* ================= PERMANENT DELETE ================= */
        case "PERMANENT_DELETE": {
            const { conversationId, messageId } = action;
            const updatedMsgs = (state.messages[conversationId] || []).filter(
                m => String(m._id) !== String(messageId)
            );
            return {
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: updatedMsgs
                },
               
                conversations: safeConversations.map(conv => {
                    const id = conv._id || conv.conversationId;
                    if (String(id) === String(conversationId)) {
                       
                        const lastMsg = updatedMsgs[updatedMsgs.length - 1];
                        return {
                            ...conv,
                            lastMessage: lastMsg || conv.lastMessage
                        };
                    }
                    return conv;
                })
            };
        }

        /* ================= CONVERSATIONS ================= */
        case LOAD_CONVERSATIONS: {
            const convs = (action.conversations || [])
                .filter(c => c && (c._id || c.conversationId))
                .map(c => ({
                    ...c,
                  
                    messageCount: 
                        String(c._id || c.conversationId) === String(state.currentConversationId) 
                            ? 0  // Keep current conversation count at 0 to avoid flickering
                            : (c.unreadCount || 0)
                }))
                .sort((a, b) => {
                    const aTime = a.lastMessage?.timestamp || a.createdAt;
                    const bTime = b.lastMessage?.timestamp || b.createdAt;
                    return new Date(bTime) - new Date(aTime);
                });

            console.log('📥 LOAD_CONVERSATIONS:', {
                count: convs.length,
                conversations: convs.map(c => ({
                    id: c._id?.toString?.().slice?.(-6),
                    groupName: c.groupName,
                    isGroup: c.isGroup,
                    unreadCount: c.unreadCount,
                    messageCount: c.messageCount
                }))
            });

            return {
                ...state,
                conversations: convs
            };
        }

        /* ================= ALL USERS ================= */
        case LOAD_ALL_USERS: {
            return {
                ...state,
                allUsers: (action.users || []).map(u => ({
                    ...u,
                    online: !!u.online // Use the online status from backend
                }))
            };
        }

        /* ================= PRESENCE ================= */
        case UPDATE_PRESENCE: {
            const { username, isOnline, lastSeen } = action;

            console.log('🔄 REDUCER: UPDATE_PRESENCE', {
                username,
                isOnline,
                lastSeen,
                conversationCount: safeConversations.length
            });

            const updated = safeConversations.map(conv => {
                const hasUser = conv.participants?.some(p => p.username === username);
                if (!hasUser) return conv;

                return {
                    ...conv,
                    participants: (conv.participants || []).map(p => {
                        if (p.username === username) {
                            console.log('✅ Updated participant online status:', { username, isOnline });
                            return { ...p, online: isOnline, lastSeen };
                        }
                        return p;
                    })
                };
            });

            console.log('✅ REDUCER UPDATE_PRESENCE DONE - conversations updated:', updated.length);

            // ✅ Also update allUsers for global sync
            const updatedAllUsers = (state.allUsers || []).map(u => {
                if (u.username === username) {
                    return { ...u, online: isOnline, lastSeen };
                }
                return u;
            });

            return {
                ...state,
                conversations: updated,
                allUsers: updatedAllUsers
            };
        }

        /* ================= CURRENT ================= */
        case SET_CURRENT_CONVERSATION:
            return {
                ...state,
                currentConversationId: action.conversationId
            };

        /* ================= UNREAD ================= */
        case CLEAR_UNREAD:
            return {
                ...state,
                conversations: safeConversations.map(conv => {
                    const convId = conv._id || conv.conversationId;
                    if (String(convId) === String(action.conversationId)) {
                        return { ...conv, messageCount: 0 };
                    }
                    return conv;
                })
            };

        /* ================= ADD ================= */
        case ADD_CONVERSATION:
            return {
                ...state,
                conversations: [
                    action.conversation,
                    ...safeConversations
                ]
            };

        default:
            return state;
    }
};

export default ChatReducer;