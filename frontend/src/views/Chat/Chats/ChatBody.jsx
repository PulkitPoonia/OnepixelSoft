import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Trash2, Smile, CornerUpLeft, MoreVertical, Download } from 'react-feather';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import { setReply } from '../../../redux/action/Chat';
import socketService from '../../../utils/socketService';
import debugger_ from '../../../utils/debugger';

const ChatBody = ({ messages, conversationId, conversations, setReply }) => {
  const [viewImage, setViewImage] = useState(null);

  const [typingUser, setTypingUser] = useState(null);
  const [hoveredMsg, setHoveredMsg] = useState(null);
  const [actionMenuMsgId, setActionMenuMsgId] = useState(null);
  
  const [deleteDialog, setDeleteDialog] = useState({ show: false, msg: null });

  // ✅ Audio player state
  const [audioStates, setAudioStates] = useState({}); 
  const audioRefsRef = useRef({});
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const me = JSON.parse(localStorage.getItem("user") || "{}");
  const [downloadingFileId, setDownloadingFileId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // ✅ Handle downloading and saving file to file manager
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      setDownloadingFileId(fileId);
      setDownloadError(null);

      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');

      if (!token) {
        setDownloadError('Authentication required');
        return;
      }

      console.log('📥 [FILE DOWNLOAD] Saving file to file manager:', { fileId, fileName });

      const response = await fetch(`${BASE_URL}/api/files/save-from-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileId, fileName })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ File saved to file manager:', fileName);
        alert(`File "${fileName}" saved to your file manager!`);
      } else {
        setDownloadError(data.error || 'Failed to save file');
        alert('Error: ' + (data.error || 'Failed to save file'));
      }
    } catch (err) {
      console.error('❌ Download error:', err);
      setDownloadError(err.message);
      alert('Error: ' + err.message);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const localMessages = useMemo(() => {
    const result = (messages?.[conversationId] || []).filter(msg => {
      if (msg.deletedFor && Array.isArray(msg.deletedFor)) {
        return !msg.deletedFor.includes(me.username);
      }
      return true;
    });
    
    if (result.length > 0) {
      const lastMsg = result[result.length - 1];
      debugger_.verbose_log('🔄 ChatBody re-rendering with localMessages:', {
        convId: conversationId,
        msgCount: result.length,
        lastMsgId: lastMsg._id,
        lastMsgSeenBy: lastMsg.seenBy
      });
    }
    
    return result;
  }, [messages, conversationId, me.username]);

  useEffect(() => {
    if (!localMessages.length) return;
    const lastMsg = localMessages[localMessages.length - 1];
    if (lastMsg && !isMyMessage(lastMsg) && document.visibilityState !== 'visible') {
      if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(lastMsg.senderName || lastMsg.senderId || "New Message", {
            body: lastMsg.text && lastMsg.text.length > 100 ? lastMsg.text.slice(0, 100) + '...' : lastMsg.text,
            icon: '/favicon.ico'
          });
        } else if (Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    }
  }, [localMessages]);

  const isMyMessage = (msg) => {
    return (
      msg?.senderId === me?._id ||
      msg?.senderId === me?.id ||
      msg?.senderId === me?.username
    );
  };

  /* ================= TYPING ================= */
  useEffect(() => {
    const handleTyping = ({ username }) => {
      if (!username || username === me.username) return;
      setTypingUser(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUser(null);
      }, 1500);
    };
    socketService.on('typing', handleTyping);
    return () => socketService.off('typing', handleTyping);
  }, [me.username]);

  /* ================= SCROLL ================= */
  useEffect(() => {
    if (!conversationId) return;
    
    // Scroll to bottom when messages change or conversation opens
    const scrollToBottom = () => {
      setTimeout(() => {
        if (bottomRef.current) {
          debugger_.verbose_log('📍 Scrolling to bottom:', { msgCount: localMessages.length });
          bottomRef.current.scrollIntoView({ behavior: "auto", block: "end" });
        }
      }, 100);
    };
    
    scrollToBottom();
  }, [conversationId, localMessages.length]);

  /* ================= MARK CHAT AS SEEN ================= */
  useEffect(() => {
    if (conversationId && localMessages.length > 0) {
      const unseen = localMessages.filter(m => {
        if (isMyMessage(m)) return false; 
        return !Array.isArray(m.seenBy) || !m.seenBy.includes(me.username);
      });
      
    if (unseen.length > 0) {
  const messageIds = unseen.map(m => m._id);

  console.log('🔔 Found unseen messages, calling confirmSeen:', {
    conversationId,
    unseenCount: unseen.length,
    messageIds
  });

  socketService.confirmSeen(messageIds, conversationId);
}
    }
  }, [conversationId, localMessages, me.username]);

  const formatTime = (t) =>
    new Date(t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const groupMessages = useMemo(() => {
    const g = {};
    localMessages.forEach(m => {
      const k = new Date(m.timestamp).toDateString();
      if (!g[k]) g[k] = [];
      g[k].push(m);
    });
    return g;
  }, [localMessages]);

  const formatDate = (d) => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (d === today) return "Today";
    if (d === yesterday) return "Yesterday";
    return d;
  };

const renderMessage = (msg) => {

  if (msg.deletedForEveryone || msg.text === "") {
    debugger_.verbose_log('renderMessage: deleted placeholder', {
      _id: msg._id,
      deletedForEveryone: msg.deletedForEveryone,
      text: msg.text
    });
    const isMine = isMyMessage(msg);
    return (
      <span style={{ fontStyle: 'italic', color: 'gray' }}>
        {isMine ? 'You deleted this message' : 'This message was deleted'}
      </span>
    );
  }

  if (!msg?.text) {
    debugger_.verbose_log('renderMessage: empty text, not deletedForEveryone');
    return null;
  }


    let pdfData = null;
    let fileData = null;
    const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

    try {
      const parsed = JSON.parse(msg.text);
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.data &&
        parsed.name &&
        typeof parsed.data === 'string' &&
        parsed.data.startsWith('data:application/pdf')
      ) {
        pdfData = parsed;
      }
      
      // Handle both fileId (new database format) and fileUrl (legacy format)
      if (parsed && typeof parsed === 'object' && (parsed.fileId || parsed.fileUrl) && parsed.fileName) {
        fileData = {
          fileId: parsed.fileId,
          fileUrl: parsed.fileUrl || `${BASE_URL}/api/chat/file/${parsed.fileId}`, // Use full URL with BASE_URL
          fileName: parsed.fileName,
          type: parsed.type,
          duration: parsed.duration
        };
      }
    } catch {}

    // Images
    if (msg.text.startsWith('data:image')) {
      return (
        <img
          src={msg.text}
          className="msg-image"
          alt="img"
          onClick={() => setViewImage(msg.text)}
          style={{ cursor: 'pointer' }}
        />
      );
    }

   
    if (fileData) {
      const { fileUrl, fileName, type, duration } = fileData;
      
     
      if (type === 'audio' || /\.(webm|mp3|wav|ogg|m4a)$/i.test(fileName)) {
        const handlePlayClick = () => {
          const audioEl = audioRefsRef.current[fileUrl];
          if (!audioEl) return;
          
          if (audioEl.paused) {
            audioEl.play();
            setAudioStates(prev => ({
              ...prev,
              [fileUrl]: { ...prev[fileUrl], isPlaying: true }
            }));
          } else {
            audioEl.pause();
            setAudioStates(prev => ({
              ...prev,
              [fileUrl]: { ...prev[fileUrl], isPlaying: false }
            }));
          }
        };

        const handleTimeUpdate = (e) => {
          const audio = e.target;
          setAudioStates(prev => ({
            ...prev,
            [fileUrl]: {
              ...prev[fileUrl],
              currentTime: audio.currentTime,
              duration: audio.duration
            }
          }));
        };

        const handleProgressClick = (e) => {
          const audio = audioRefsRef.current[fileUrl];
          if (!audio || !audio.duration) return;
          
          const rect = e.currentTarget.getBoundingClientRect();
          const percent = (e.clientX - rect.left) / rect.width;
          audio.currentTime = percent * audio.duration;
        };

        const state = audioStates[fileUrl] || { isPlaying: false, currentTime: 0, duration: duration || 0 };
        const currentTime = state.currentTime || 0;
        const totalTime = state.duration || duration || 0;
        const progress = totalTime ? (currentTime / totalTime) * 100 : 0;

        return (
          <div className="whatsapp-audio-container">
            <audio
              ref={el => audioRefsRef.current[fileUrl] = el}
              src={fileUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setAudioStates(prev => ({ ...prev, [fileUrl]: { ...prev[fileUrl], isPlaying: false } }))}
              onLoadedMetadata={(e) => setAudioStates(prev => ({ ...prev, [fileUrl]: { ...prev[fileUrl], duration: e.target.duration } }))}
              style={{ display: 'none' }}
            />
            
            <div className="whatsapp-audio-player">
              <button 
                className="audio-play-btn"
                onClick={handlePlayClick}
                title={state.isPlaying ? 'Pause' : 'Play'}
              >
                {state.isPlaying ? '⏸' : '▶'}
              </button>
              
              {state.isPlaying && (
                <div className="audio-visualizer">
                  <span className="audio-bar"></span>
                  <span className="audio-bar"></span>
                  <span className="audio-bar"></span>
                </div>
              )}
              
              <div className="audio-progress-section">
                <div 
                  className="audio-progress-bar"
                  onClick={handleProgressClick}
                >
                  <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
                  <div className="audio-progress-handle" style={{ left: `${progress}%` }} />
                </div>
              </div>

              <span className="audio-duration-text">
                {`${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')} / ${Math.floor(totalTime / 60)}:${Math.floor(totalTime % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
          </div>
        );
      }
      
      if (type === 'pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <span>📄 {fileName}</span>
            {fileData.fileId && (
              <button
                onClick={() => handleDownloadFile(fileData.fileId, fileName)}
                disabled={downloadingFileId === fileData.fileId}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: downloadingFileId === fileData.fileId ? 'wait' : 'pointer',
                  opacity: 0.7,
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Save to File Manager"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        );
      } else if (type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
        return (
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img
              src={fileUrl}
              className="msg-image"
              alt={fileName}
              onClick={() => setViewImage(fileUrl)}
              style={{ cursor: 'pointer', borderRadius: '8px', transition: 'transform 0.2s ease' }}
            />
            {fileData.fileId && (
              <button
                onClick={() => handleDownloadFile(fileData.fileId, fileName)}
                disabled={downloadingFileId === fileData.fileId}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: 'none',
                  color: 'white',
                  cursor: downloadingFileId === fileData.fileId ? 'wait' : 'pointer',
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Save to File Manager"
              >
                <Download size={16} />
              </button>
            )}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <span>📎 {fileName}</span>
          {fileData.fileId && (
            <button
              onClick={() => handleDownloadFile(fileData.fileId, fileName)}
              disabled={downloadingFileId === fileData.fileId}
              style={{
                background: 'none',
                border: 'none',
                cursor: downloadingFileId === fileData.fileId ? 'wait' : 'pointer',
                opacity: 0.7,
                padding: '0',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Save to File Manager"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      );
    }

    // Audio
    if (msg.text.startsWith('data:audio')) {
      return <audio controls src={msg.text} />;
    }

    if (pdfData) {
      return (
        <a href={pdfData.data} download={pdfData.name} target="_blank" rel="noopener noreferrer">
          📄 {pdfData.name}
        </a>
      );
    }

 
    if (msg.text.startsWith('data:application/pdf')) {
      const fallbackName = msg.fileName || msg.filename || 'file.pdf';
      return (
        <a href={msg.text} download={fallbackName} target="_blank" rel="noopener noreferrer">
          📄 {fallbackName}
        </a>
      );
    }


    if (msg.text.trim().startsWith('{') && msg.text.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(msg.text);
        if (parsed && parsed.data && parsed.name) {
         
          return <span>{parsed.name}</span>;
        }
      } catch {}
    }

    return msg.text;
  };

  const addReaction = (msgId, emoji) => {
    socketService.emit("react_message", {
      messageId: msgId,
      emoji,
      conversationId
    });
  };

  // ✅ HELPER: Extract display text from message (handles JSON-encoded files)
  const getMessagePreviewText = (message) => {
    if (!message?.text) return 'Empty message';
    
    try {
      const parsed = JSON.parse(message.text);
      if (parsed && typeof parsed === 'object') {
        if (parsed.fileUrl && parsed.fileName) {
          // For files, show appropriate emoji based on type
          if (parsed.type === 'audio' || /\.(webm|mp3|wav|ogg|m4a)$/i.test(parsed.fileName)) {
            return `🎤 ${parsed.fileName || 'Voice message'}`;
          }
          if (parsed.type === 'pdf' || parsed.fileName?.toLowerCase().endsWith('.pdf')) {
            return `📄 ${parsed.fileName}`;
          }
          if (parsed.type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(parsed.fileName)) {
            return `📷 ${parsed.fileName}`;
          }
          return `📎 ${parsed.fileName}`;
        }
        return 'File attachment';
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }
    
    if (message.text.startsWith('data:image')) {
      return '📷 Image';
    }
    
    // Plain text message
    return message.text.slice(0, 50);
  };

  if (!conversationId) {
    return <div className="empty-chat-screen">Select a conversation</div>;
  }

 
  let isRecipientOnline = false;
  const currentConv = (conversations || []).find(c => 
    String(c._id) === String(conversationId) || String(c.conversationId) === String(conversationId)
  );
  
  if (currentConv && Array.isArray(currentConv.participants)) {
    const otherUser = currentConv.participants.find(p => p.username !== me.username);
    if (otherUser && (otherUser.online || otherUser.isOnline)) {
      isRecipientOnline = true;
    }
  }

  return (
    <div className="chat-body">
      {viewImage && (
        <div className="img-view-modal" onClick={() => setViewImage(null)}>
          <div className="img-view-backdrop" />
          <img src={viewImage} className="img-view-large" alt="view" />
        </div>
      )}
     <SimpleBar style={{ height: "100%", width: "100%" }}>
        <div className="chat-container">

          {Object.entries(groupMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="msg-date">{formatDate(date)}</div>

              {msgs.map((msg, i) => {
                const isSent = isMyMessage(msg);

                
                const delivered =
                  Array.isArray(msg.deliveredTo) && msg.deliveredTo.length > 0;

              
                const otherParticipants = currentConv?.participants?.filter(p => p.username !== msg.senderId) || [];
                const seenByArray = Array.isArray(msg.seenBy) ? msg.seenBy : [];
                
              
                const allOthersSeen = otherParticipants.length > 0 && 
                  otherParticipants.every(p => seenByArray.includes(p.username));
                
                const otherUserSeen = allOthersSeen;

                // 🔍 DEBUG: Log message status for tracking
                if (isSent && msg._id) {
                  debugger_.log('MESSAGE', `Rendering sent message [${msg._id?.toString().slice(-6)}]`, {
                    conversationId: msg.conversationId,
                    delivered,
                    otherParticipants: otherParticipants.length,
                    seenBy: seenByArray,
                    deliveredTo: msg.deliveredTo || [],
                    allOthersSeen,
                    currentConvParticipants: currentConv?.participants?.length,
                    statusIcon: otherUserSeen ? '✓✓ BLUE' : delivered ? '✓✓ GRAY' : '✓'
                  });
                }

                if (isSent && i === msgs.length - 1) {
                  debugger_.log('MESSAGE', '📊 LAST SENT MESSAGE RENDER:', {
                    messageId: msg._id?.toString().slice(-6),
                    seenBy: msg.seenBy,
                    deliveredTo: msg.deliveredTo,
                    otherUserSeen,
                    participantsCount: otherParticipants.length
                  });
                }

                return (
                  <div
                    key={msg._id || i}
                    data-msg-id={msg._id}
                    className={`msg-row ${isSent ? 'sent' : 'received'}`}
                    onMouseEnter={() => setHoveredMsg(msg._id)}
                    onMouseLeave={() => setHoveredMsg(null)}
                  >
                    <div className="msg-bubble-pro">
                      {hoveredMsg === msg._id && (
                        <button
                          className="msg-bubble-options-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuMsgId(msg._id);
                          }}
                          title="More options"
                        >
                          <span className="msg-bubble-options-dot">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                        </button>
                      )}
                     {msg.replyTo && (
  (() => {
    const replyMsg = localMessages.find(
      m => String(m._id) === String(msg.replyTo)
    );

    const handleReplyClick = () => {
      if (!replyMsg) {
        debugger_.logWarning('ChatBody/handleReplyClick', 'Reply message not found', { replyToId: msg.replyTo });
        return;
      }
      
      debugger_.log('MESSAGE', 'Reply Clicked', {
        replyingToId: replyMsg._id,
        sender: replyMsg.senderId,
        text: replyMsg.text?.slice(0, 50)
      });
      
      // Find the message element and scroll to it
      const replyMsgElement = document.querySelector(`[data-msg-id="${replyMsg._id}"]`);
      if (replyMsgElement) {
        debugger_.log('COMPONENT', 'Scrolling to Reply', { messageId: replyMsg._id });
        // Highlight the message temporarily
        replyMsgElement.classList.add('highlight-reply');
        replyMsgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 2 seconds
        setTimeout(() => {
          replyMsgElement.classList.remove('highlight-reply');
        }, 2000);
      } else {
        debugger_.logWarning('ChatBody/handleReplyClick', 'Reply message element not found in DOM', { messageId: replyMsg._id });
      }
    };

    return (
      <div 
        className="reply-box" 
        onClick={handleReplyClick}
        style={{ cursor: replyMsg ? 'pointer' : 'default' }}
      >
        {replyMsg ? getMessagePreviewText(replyMsg) : "..."}
      </div>
    );
  })()
)}
{!isSent && currentConv && (currentConv.isGroup || currentConv.groupName || (currentConv.participants?.length > 2)) && (
  <div className="group-sender-name">
    {msg.senderName || msg.senderId}
  </div>
)}
                      <div className="msg-row-flex-pro">
                       
                        
                        <div className="msg-text-pro">{renderMessage(msg)}</div>
                        <div className={`msg-meta-pro ${isSent ? 'sent' : 'received'}`}> 
                          <span className="msg-time-pro">{formatTime(msg.timestamp)}</span>
                          
{isSent && !msg.deletedForEveryone && (
  <span 
    className={`tick${otherUserSeen ? ' seen' : ''}`}
    style={{
      marginLeft: '4px',
      color: otherUserSeen ? '#34b7f1' : delivered ? '#999' : '#999',
      fontSize: '12px',
      fontWeight: otherUserSeen ? '600' : '400'
    }}
  >
    {otherUserSeen ? '✓✓' : delivered ? '✓✓' : '✓'}
  </span>
)}

                        </div>
                      </div>
                     {!msg.deletedForEveryone && msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="reactions">
                          {Object.entries(msg.reactions).map(([emoji, users]) => (
                            <span key={emoji}>{emoji} {users.length}</span>
                          ))}
                        </div>
                      )}
                     {actionMenuMsgId === msg._id && (
  <div
  className={`msg-action-menu ${msg._id === localMessages[localMessages.length - 1]?._id ? 'menu-up' : ''}`}
  onMouseLeave={() => setActionMenuMsgId(null)}
>

  {!msg.deletedForEveryone && (
    <>
     
      <button
        className="msg-action-item"
        onClick={(e) => {
          e.stopPropagation();
          setReply(msg);
          setActionMenuMsgId(null);
        }}
      >
        <CornerUpLeft size={14} /> Reply
      </button>

    {!msg.deletedForEveryone && (
  <button
    className="msg-action-item danger"
    onClick={(e) => {
      e.stopPropagation();

      if (isSent) {
        setDeleteDialog({ show: true, msg });
      } else {
       
        socketService.emit('delete_message', {
          messageId: msg._id,
          conversationId,
          forEveryone: false
        });
      }

      setActionMenuMsgId(null);
    }}
  >
    <Trash2 size={14} /> Delete
  </button>
)}
    </>
  )}

  {msg.deletedForEveryone && (
    <button
      className="msg-action-item danger"
      onClick={(e) => {
        e.stopPropagation();
        socketService.emit('delete_message', {
          messageId: msg._id,
          conversationId,
          permanent: true
        });
        setActionMenuMsgId(null);
      }}
    >
      <Trash2 size={14} /> Delete 
    </button>
  )}

</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {typingUser && (
            <div className="typing">Typing...</div>
          )}

          <div ref={bottomRef} />
        </div>
      </SimpleBar>

     
      {deleteDialog.show && deleteDialog.msg && (
        <div className="delete-dialog-overlay" onClick={() => setDeleteDialog({ show: false, msg: null })}>
          <div className="delete-dialog" onClick={e => e.stopPropagation()}>
            <div className="delete-dialog-title">Delete message?</div>
            <div className="delete-dialog-actions">
              <button
                className="delete-dialog-btn delete-everyone"
                onClick={() => {
                  socketService.emit('delete_message', {
                    messageId: deleteDialog.msg._id,
                    conversationId,
                    forEveryone: true
                  });
                  setDeleteDialog({ show: false, msg: null });
                }}
              >
                Delete for everyone
              </button>
              <button
                className="delete-dialog-btn delete-me"
                onClick={() => {
                  socketService.emit('delete_message', {
                    messageId: deleteDialog.msg._id,
                    conversationId,
                    forEveryone: false
                  });
                  setDeleteDialog({ show: false, msg: null });
                }}
              >
                Delete for me
              </button>
              <button
                className="delete-dialog-btn cancel"
                onClick={() => setDeleteDialog({ show: false, msg: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* --- Ticks Styles --- */
        .tick {
          margin-left: 4px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          display: inline-block;
          line-height: 1;
        }
        .tick.seen {
          color: #34b7f1 !important;
        }

        /* --- Delete Dialog Styles --- */
        .delete-dialog-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.25);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .delete-dialog {
          background: var(--bg-sidebar, #fff);
          color: var(--text-primary, #222);
          border-radius: 8px;
          padding: 24px 20px 16px 20px;
          min-width: 260px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.12);
          text-align: center;
          transition: background 0.2s, color 0.2s;
        }
        .delete-dialog-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 18px;
        }
        .delete-dialog-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .delete-dialog-btn {
          padding: 8px 0;
          border: none;
          border-radius: 4px;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.2s, color 0.2s;
        }
        .delete-everyone {
          background: #ff3b30;
          color: #fff;
        }
        .delete-everyone:hover {
          background: #e22b20;
        }
        .delete-me {
          background: var(--bg-header, #f1f1f1);
          color: var(--text-primary, #222);
        }
        .delete-me:hover {
          background: var(--border, #e0e0e0);
        }
        .cancel {
          background: transparent;
          color: var(--text-secondary, #888);
        }
        .cancel:hover {
          text-decoration: underline;
        }
        @media (prefers-color-scheme: dark) {
          .delete-dialog {
            background: var(--bg-sidebar, #23272f);
            color: var(--text-primary, #f1f1f1);
          }
          .delete-me {
            background: var(--bg-header, #23272f);
            color: var(--text-primary, #f1f1f1);
          }
        }

        /* --- Bubble & Options Styles --- */
        .msg-bubble-options-btn {
          position: absolute;
          top: 6px;
          right: 6px;
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          z-index: 101;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .msg-bubble-options-btn:hover {
          background: rgba(0, 0, 0, 0.06);
        }
        .msg-bubble-options-dot {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: none;
          border-radius: 0;
          box-shadow: none;
          border: none;
          position: relative;
          opacity: 0.92;
          transition: background 0.15s, box-shadow 0.15s;
          transform: rotate(90deg);
        }
        .msg-bubble-options-dot span {
          display: block;
          width: 3px;
          height: 3px;
          background: var(--text-secondary);
          border-radius: 50%;
          margin: 1.5px auto;
          transition: background 0.15s;
        }
        .msg-bubble-options-btn:hover .msg-bubble-options-dot span {
          background: var(--theme-primary, #00a884);
        }
        .msg-menu-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: var(--text-secondary);
          border-radius: 50%;
          margin: 0 2px;
          box-shadow: 0 0 0 1px var(--border);
        }
        .img-view-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .img-view-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.7);
          z-index: 9998;
        }
        .img-view-large {
          max-width: 90vw;
          max-height: 80vh;
          border-radius: 16px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.25);
          z-index: 9999;
          position: relative;
          background: #fff;
          padding: 8px;
        }
        .msg-image {
          max-width: 280px;
          max-height: 240px;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: block;
          margin: 0;
          object-fit: cover;
        }
        .chat-container {
          padding: 16px 12px;
          width: 100%;
          max-width: 100%;
        }
        .msg-row {
          display: flex;
          margin: 10px 0;
          position: relative;
          overflow: visible;
        }
        .sent { justify-content: flex-end; }
        .received { justify-content: flex-start; }
        .msg-bubble-pro {
          max-width: 68%;
          min-width: 80px;
          padding: 12px 12px 6px 12px;
          border-radius: 16px;
          background: var(--msg-received);
          color: var(--text-primary);
          position: relative;
          min-height: 32px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: visible;
        }
        /* Reduce padding for image-only messages */
        .msg-bubble-pro:has(.msg-image:only-child) {
          padding: 0;
        }
        .sent .msg-bubble-pro {
          background: var(--msg-sent);
        }
        .msg-row-flex-pro {
          display: flex;
          align-items: flex-end;
          gap: 6px;
          min-height: 24px;
        }
        /* Remove gap for image-only messages */
        .msg-row-flex-pro:has(.msg-image:only-child) {
          gap: 0;
        }
        .msg-text-pro {
          font-size: 15px;
          line-height: 1.4;
          word-break: break-word;
          flex: 1;
          margin: 0;
          padding: 0;
        }
       .msg-meta-pro {
        display: flex;
         align-items: center;
         gap: 2px;
         font-size: 11px;
         color: var(--text-secondary);
          white-space: nowrap;
          padding-bottom: 2px;
        }
        .msg-meta-pro.sent {
          flex-direction: row-reverse;
          margin-left: 8px;
        }
        .msg-meta-pro.received {
          margin-right: 0;
          gap: 0;
        }
        .msg-meta-pro.received .msg-time-pro {
          margin-left: 18px;
        }
        .msg-time-pro {
          font-variant-numeric: tabular-nums;
          opacity: 0.8;
        }
        .msg-date {
          text-align: center;
          margin: 16px 0 8px 0;
          font-size: 12px;
          color: var(--text-secondary);
          letter-spacing: 1px;
          font-weight: 500;
        }
        .msg-action-menu {
          position: absolute;
          top: 100%;
          right: -8px;
          background: var(--bg-sidebar);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: visible;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          margin-top: 4px;
          min-width: 140px;
        }
        .msg-action-menu.menu-up {
          top: auto;
          bottom: 100%;
          margin-top: 0;
          margin-bottom: 4px;
        }
        .msg-action-item {
          padding: 10px 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          cursor: pointer;
          background: none;
          border: none;
          width: 100%;
          color: var(--text-primary);
          font-size: 14px;
          text-align: left;
          white-space: nowrap;
          transition: background 0.15s ease;
        }
        .msg-action-item:hover {
          background: var(--bg-header);
        }
        .msg-action-item.danger {
          color: #ff3b30;
        }
        .msg-action-item.danger:hover {
          background: rgba(255, 59, 48, 0.1);
        }
       .reply-box {
  font-size: 12px;
  padding: 6px 8px;
  margin-bottom: 6px;
  border-left: 3px solid var(--primary);
  background: rgba(0,0,0,0.08);
  border-radius: 6px;

  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: background 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.reply-box:hover {
  background: rgba(0, 0, 0, 0.12);
  transform: translateX(2px);
}

.msg-row.highlight-reply {
  animation: highlightMessage 2s ease;
}

@keyframes highlightMessage {
  0% {
    background: rgba(52, 183, 241, 0.3);
    box-shadow: 0 0 12px rgba(52, 183, 241, 0.4);
  }
  50% {
    background: rgba(52, 183, 241, 0.2);
    box-shadow: 0 0 8px rgba(52, 183, 241, 0.3);
  }
  100% {
    background: transparent;
    box-shadow: none;
  }
}
        .reactions {
          margin-top: 4px;
          font-size: 12px;
          background: var(--bg-header);
          padding: 2px 6px;
          border-radius: 10px;
          display: inline-block;
        }
        .typing {
          font-size: 13px;
          color: var(--text-secondary);
          padding: 10px;
        }

        /* ✅ WHATSAPP STYLE AUDIO PLAYER */
        .whatsapp-audio-container {
          margin: 4px 0;
          display: inline-block;
          width: 100%;
        }

        .whatsapp-audio-player {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: transparent;
          border-radius: 18px;
        }

        .audio-play-btn {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: var(--primary);
          color: white;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .audio-play-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .audio-play-btn:active {
          transform: scale(0.95);
        }

        /* Audio Visualizer Bars */
        .audio-visualizer {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 24px;
        }

        .audio-bar {
          width: 2px;
          background: var(--primary);
          border-radius: 1px;
          animation: audioBarAnimation 0.6s ease-in-out infinite;
        }

        .audio-bar:nth-child(1) {
          animation-delay: 0s;
          height: 8px;
        }

        .audio-bar:nth-child(2) {
          animation-delay: 0.2s;
          height: 12px;
        }

        .audio-bar:nth-child(3) {
          animation-delay: 0.4s;
          height: 8px;
        }

        @keyframes audioBarAnimation {
          0%, 100% {
            height: 4px;
            opacity: 0.5;
          }
          50% {
            height: 16px;
            opacity: 1;
          }
        }

        .audio-progress-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .audio-progress-bar {
          flex: 1;
          height: 3px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
          cursor: pointer;
          position: relative;
          transition: height 0.2s ease;
        }

        .audio-progress-bar:hover {
          height: 4px;
        }

        .audio-progress-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 2px;
          transition: width 0.1s linear;
        }

        .audio-progress-handle {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 12px;
          height: 12px;
          background: var(--primary);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .audio-progress-bar:hover .audio-progress-handle {
          opacity: 1;
        }

        .audio-duration-text {
          font-size: 12px;
          color: var(--text-secondary);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          min-width: 50px;
          text-align: center;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        /* Sent message styling */
        .msg-row.sent .audio-play-btn {
          background: var(--primary);
        }

        .msg-row.sent .audio-progress-fill {
          background: var(--primary);
        }

        .msg-row.sent .audio-progress-handle {
          background: var(--primary);
        }

        /* Received message styling */
        .msg-row.received .audio-play-btn {
          background: var(--primary);
        }

        .msg-row.received .audio-progress-fill {
          background: var(--primary);
        }
        .group-sender-name{
  font-size:14px;
  font-weight:700;
  margin-bottom:4px;
  color:#00a884;
  letter-spacing:0.3px;
  display:block;
}

.msg-text-pro{
  font-size:15px;
  font-weight:400;
}
        @media (max-width: 600px) {
          .whatsapp-audio-player {
            padding: 6px 10px;
          }

          .audio-play-btn {
            width: 36px;
            height: 36px;
            font-size: 14px;
          }

          .audio-duration-text {
            min-width: 45px;
            font-size: 11px;
          }
            .group-sender-name{
           opacity:0.9;
}

        }
      `}</style>
    </div>
  );
};



const mapStateToProps = (state) => {
  const mappedMessages = state.chatReducer.messages;
  const mappedConversations = state.chatReducer.conversations;
  
  debugger_.verbose_log('Redux connect mapStateToProps called:', {
    messageConvCount: Object.keys(mappedMessages).length,
    conversationCount: mappedConversations?.length || 0
  });
  
  return {
    messages: mappedMessages,
    conversations: mappedConversations
  };
};

const mapDispatchToProps = {
  setReply
};

export default connect(mapStateToProps, mapDispatchToProps)(ChatBody);