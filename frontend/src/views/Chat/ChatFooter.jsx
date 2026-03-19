import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Mic, X, CornerUpLeft } from 'react-feather';
import { connect } from 'react-redux';
import { clearReply } from '../../redux/action/Chat';
import socketService from '../../utils/socketService';
import debugger_ from '../../utils/debugger';
import EmojiPicker from 'emoji-picker-react';

const ChatFooter = ({ conversationId, currentConversationId, replyingTo, clearReply }) => {
  // ✅ FIX: Support both prop names for backwards compatibility
  const activeConversationId = conversationId || currentConversationId;
  const replyTo = replyingTo;

  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0); // ✅ Recording duration timer
  const [recordingStartTime, setRecordingStartTime] = useState(null); // ✅ Recording start timestamp
  const [preview, setPreview] = useState(null);
  const [fileName, setFileName] = useState(''); // ✅ New state for real file name
  const [uploading, setUploading] = useState(false); // ✅ Upload progress state
  const [uploadError, setUploadError] = useState(null); // ✅ Upload error state

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const emojiRef = useRef(null);
  const recordingIntervalRef = useRef(null); // ✅ Recording timer interval

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  /* CLICK OUTSIDE */
  useEffect(() => {
    const handleClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* SEND */
  const sendMessage = () => {
    if ((!message.trim() && !preview) || !activeConversationId) {
      debugger_.logWarning('ChatFooter/sendMessage', 'Empty message or no conversation', {
        hasMessage: !!message.trim(),
        hasPreview: !!preview,
        conversationId: activeConversationId
      });
      return;
    }

    debugger_.log('MESSAGE', 'Sending Message', {
      type: preview ? (preview.includes('.pdf') ? 'pdf' : 'audio') : 'text',
      conversationId: activeConversationId,
      hasReply: !!replyTo,
      textLength: message?.length || 0
    });

    // Helper function to detect file type
    const getFileType = (name) => {
      const lower = name.toLowerCase();
      if (lower.endsWith('.pdf')) return 'pdf';
      if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lower)) return 'image';
      if (/\.(mp4|webm|mov|avi|mkv)$/i.test(lower)) return 'video';
      if (/\.(doc|docx|txt|xls|xlsx|ppt|pptx)$/i.test(lower)) return 'document';
      return 'file';
    };

    // If preview contains a file ID from database, send it as metadata
    if (preview && preview.match(/^[a-f0-9]{24}$/)) {
      const fileType = getFileType(fileName);
      const textToSend = JSON.stringify({
        fileId: preview,
        fileName: fileName,
        type: fileType
      });
      console.log('[FILE SEND DEBUG] preview:', preview);
      console.log('[FILE SEND DEBUG] fileName state:', fileName);
      console.log('[FILE SEND DEBUG] fileType:', fileType);
      console.log('[FILE SEND] Sending file from database:', { fileId: preview, fileName, type: fileType });
      console.log('[FILE SEND DEBUG] textToSend:', textToSend);
      debugger_.log('MESSAGE', 'Sending File', { fileName, fileId: preview, type: fileType });

      socketService.emit("send_message", {
        text: textToSend,
        conversationId: activeConversationId,
        replyTo: replyTo?._id || null
      });
    } else if (preview && preview.startsWith('/uploads/')) {
      // Legacy support for old fileUrl format
      const fileType = getFileType(fileName);
      const textToSend = JSON.stringify({
        fileUrl: preview,
        fileName: fileName,
        type: fileType
      });
      console.log('[FILE SEND DEBUG] preview:', preview);
      console.log('[FILE SEND DEBUG] fileName state:', fileName);
      console.log('[FILE SEND DEBUG] fileType:', fileType);
      console.log('[FILE SEND] Sending file URL (legacy):', { fileUrl: preview, fileName, type: fileType });
      console.log('[FILE SEND DEBUG] textToSend:', textToSend);
      debugger_.log('MESSAGE', 'Sending File', { fileName, fileUrl: preview, type: fileType });

      socketService.emit("send_message", {
        text: textToSend,
        conversationId: activeConversationId,
        replyTo: replyTo?._id || null
      });
    } else if (preview && preview.startsWith("data:audio")) {
      // ✅ SEND AUDIO RECORDING - Upload it first, then send
      console.log('[AUDIO SEND] Converting and uploading audio recording...');
      debugger_.log('MESSAGE', 'Sending Audio', { type: 'voice_message' });
      sendAudioRecording();
      return;
    } else if (message.trim()) {
      // Regular text message
      debugger_.log('MESSAGE', 'Sending Text', { text: message.slice(0, 50), hasReply: !!replyTo });
      socketService.emit("send_message", {
        text: message.trim(),
        conversationId: activeConversationId,
        replyTo: replyTo?._id || null
      });
    }

    setMessage("");
    setPreview(null);
    setFileName('');
    clearReply();
    setUploadError(null);
  };

  /* TYPING */
  const handleTyping = (value) => {
    setMessage(value);

    socketService.emit("typing", { roomId: activeConversationId });

    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socketService.emit("stop_typing", { roomId: activeConversationId });
    }, 800);
  };

  /* ENTER */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* EMOJI */
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  /* FILE */
  const handleFileSelect = () => fileInputRef.current.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    console.log('[UPLOAD START] File selected:', { name: file.name, size: file.size, type: file.type });

    // Check file size (max 1GB)
    const maxSize = 1000 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large. Maximum size is 1GB. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setFileName(file.name);
    setUploading(true);
    setUploadError(null);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token
      const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');

      console.log('[UPLOAD] Token exists:', !!token);
      console.log('[UPLOAD] Uploading to /api/chat/upload...');

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutMs = Math.max(60000, file.size / (1024 * 100)); // At least 60s, or based on file size (100KB/s min speed)
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      console.log(`[UPLOAD] File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB, Timeout: ${timeoutMs / 1000}s`);

      // Upload file to server
      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('[UPLOAD] Response received:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      console.log('[UPLOAD] Response JSON:', data);

      if (data.ok && data.fileId) {
        console.log('[FILE UPLOADED TO DB]', { fileId: data.fileId, fileName: data.fileName, size: data.size });
        // Small file (<= 50MB): stored in GridFS, preview = fileId hex string
        setPreview(data.fileId);
        setFileName(data.fileName);
      } else if (data.ok && data.fileUrl) {
        console.log('[FILE SAVED TO DISK]', { fileUrl: data.fileUrl, fileName: data.fileName, size: data.size });
        // Large file (> 50MB): stored on disk, preview = /uploads/... URL
        setPreview(data.fileUrl);
        setFileName(data.fileName);
      } else {
        console.error('[FILE UPLOAD RESPONSE ERROR]', { response: data });
        throw new Error(data.error || 'Upload failed');
      }

    } catch (err) {
      console.error('[UPLOAD ERROR]', err);
      if (err.name === 'AbortError') {
        setUploadError('Upload timeout - file took too long. Check your internet connection.');
      } else {
        setUploadError(err.message);
      }
      setPreview(null);
      setFileName('');
    } finally {
      setUploading(false);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* VOICE */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];

        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result);

        reader.readAsDataURL(blob);
        setFileName('voice_message.webm'); // ✅ Set default name for voice
        stream.getTracks().forEach(track => track.stop());

        // ✅ Stop recording timer
        clearInterval(recordingIntervalRef.current);
        setRecordingTime(0);
        setRecordingStartTime(null);
      };

      mediaRecorderRef.current.start();

      // ✅ Start recording timer
      const startTime = Date.now();
      setRecordingStartTime(startTime);
      setRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } catch (err) {
      console.error('[RECORDING ERROR]', err);
      setUploadError('Unable to access microphone. Check permissions.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ✅ FORMAT RECORDING TIME FOR DISPLAY
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ SEND AUDIO RECORDING - Upload it to server
  const sendAudioRecording = async () => {
    if (!preview || !preview.startsWith("data:audio")) {
      console.error('[AUDIO SEND] No audio recording found');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Convert data URL to blob
      const response = await fetch(preview);
      const blob = await response.blob();

      // Create FormData
      const formData = new FormData();
      formData.append('file', blob, fileName);

      // Get auth token
      const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');

      console.log('[AUDIO UPLOAD] Uploading audio recording...', { fileName, size: blob.size });

      // Upload to server
      const uploadResponse = await fetch('/api/chat/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status}`);
      }

      const data = await uploadResponse.json();

      if (data.ok && data.fileId) {
        console.log('[AUDIO UPLOADED TO DB]', { fileId: data.fileId, fileName: data.fileName });

        // ✅ Send audio message with metadata (now using fileId from database)
        const audioMetadata = JSON.stringify({
          fileId: data.fileId,
          fileName: data.fileName,
          type: 'audio',
          duration: recordingTime, // ✅ Include recording duration
          recordedAt: recordingStartTime // ✅ Include recording time
        });

        socketService.emit("send_message", {
          text: audioMetadata,
          conversationId: activeConversationId,
          replyTo: replyTo?._id || null
        });

        console.log('[AUDIO MESSAGE SENT]', { duration: recordingTime });

        // Clear states
        setMessage("");
        setPreview(null);
        setFileName('');
        clearReply();
        setRecordingTime(0);
        setRecordingStartTime(null);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('[AUDIO SEND ERROR]', err);
      setUploadError(`Failed to send audio: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ✅ HELPER: Extract display text from message (handles JSON-encoded files)
  const getMessagePreviewText = (message) => {
    if (!message?.text) return 'Empty message';

    try {
      const parsed = JSON.parse(message.text);
      if (parsed && typeof parsed === 'object') {
        if (parsed.fileUrl && parsed.fileName) {
          return `📎 ${parsed.fileName}`;
        }
        if (parsed.type === 'audio' || /\.(webm|mp3|wav|ogg|m4a)$/i.test(parsed.fileName)) {
          return `🎤 ${parsed.fileName || 'Voice message'}`;
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

  return (
    <footer className="chat-footer">

      {/* REPLY */}
      {replyTo && (
        <div className="preview-wrap">
          <div className="reply-preview">
            <div className="reply-content">
              <div className="reply-label">
                <CornerUpLeft size={14} className="reply-icon" />
                <span className="reply-sender">{replyTo.senderName || replyTo.senderId || 'User'}</span>
              </div>
              <div className="reply-text">{getMessagePreviewText(replyTo)}</div>
            </div>
            <button className="reply-close-btn" onClick={() => clearReply()} title="Remove reply">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* RECORDING INDICATOR */}
      {recording && (
        <div className="preview-wrap">
          <div className="recording-indicator" style={{
            padding: '10px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            animation: 'pulse 1.5s infinite'
          }}>
            <span>
              🔴 Recording... {recordingStartTime && new Date(recordingStartTime).toLocaleTimeString()} | Duration: {formatRecordingTime(recordingTime)}
            </span>
          </div>
        </div>
      )}

      {/* MEDIA */}
      {preview && !recording && (
        <div className="preview-wrap">
          <div className="media-preview">
            {uploading ? (
              <div className="upload-progress" style={{ padding: '10px', textAlign: 'center' }}>
                <div>Uploading {fileName}...</div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                  This may take a moment for larger files
                </div>
              </div>
            ) : preview.startsWith("/uploads/") ? (
              // ✅ File uploaded to server
              <div className="file-preview-item">
                {preview.includes('.pdf') ? (
                  <>📄</>
                ) : (
                  <>📷</>
                )}
                {' '}{fileName}
              </div>
            ) : preview.startsWith("data:image") ? (
              <img src={preview} alt="preview" />
            ) : preview.startsWith("data:audio") ? (
              // ✅ Audio recording preview
              <div className="audio-preview-item" style={{
                padding: '12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🎤</span>
                <span>{fileName}</span>
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>
            ) : (
              <div className="file-preview-item">📄 {fileName}</div>
            )}
            {!uploading && (
              <X size={16} onClick={() => {
                setPreview(null);
                setFileName('');
                setUploadError(null);
                setRecordingTime(0);
                setRecordingStartTime(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }} style={{ cursor: 'pointer' }} />
            )}
          </div>
        </div>
      )}

      {/* UPLOAD ERROR */}
      {uploadError && (
        <div className="preview-wrap">
          <div className="upload-error" style={{
            padding: '10px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '13px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Upload error: {uploadError}</span>
            <X size={14} onClick={() => setUploadError(null)} style={{ cursor: 'pointer' }} />
          </div>
        </div>
      )}

      <div className="footer-inner">
        <div className="left-icons">
          <button className="icon-btn" onClick={handleFileSelect} disabled={recording || uploading}>
            <Paperclip size={20} />
          </button>
          <input type="file" ref={fileInputRef} hidden onChange={handleFileChange} />

          <div ref={emojiRef} className="emoji-wrapper">
            <button className="icon-btn" onClick={() => setShowEmoji(v => !v)} disabled={recording || uploading}>
              <Smile size={20} />
            </button>
            {showEmoji && (
              <div className="emoji-picker">
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </div>
            )}
          </div>
        </div>

        <div className="input-wrapper">
          <textarea
            placeholder="Type a message..."
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={recording || uploading}
            rows={1}
          />
        </div>

        <div className="right-action">
          {(message.trim() || preview) ? (
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={uploading || recording}
              style={{ opacity: uploading || recording ? 0.5 : 1, cursor: uploading || recording ? 'not-allowed' : 'pointer' }}
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              className={`mic-btn ${recording ? 'recording' : ''}`}
              onClick={recording ? stopRecording : startRecording}
              disabled={uploading}
              style={{ opacity: uploading ? 0.5 : 1, cursor: uploading ? 'not-allowed' : 'pointer' }}
            >
              <Mic size={18} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        .chat-footer {
          background: var(--bg-header);
          border-top: 1px solid var(--border);
          padding: 10px 16px;
          width: 100%;
          box-sizing: border-box;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .preview-wrap {
          max-width: 850px;
          margin: 0 0 8px auto; 
        }

        .recording-indicator {
          animation: pulse 1.5s infinite !important;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 850px;
          margin: 0 0 0 auto; 
          width: 100%;
        }

        .pdf-preview-item a {
           color: var(--text-primary);
           text-decoration: none;
           font-weight: 500;
           display: flex;
           align-items: center;
           gap: 8px;
        }

        .left-icons {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .input-wrapper {
          flex: 1;
          display: flex;
          min-width: 0; 
        }

        textarea {
          width: 100%;
          resize: none;
          border-radius: 22px;
          padding: 10px 16px;
          border: none;
          outline: none;
          background: var(--bg-sidebar);
          color: var(--text-primary);
          font-size: 15px;
          height: 42px;
          line-height: 22px;
          overflow: hidden;
        }

        .right-action {
          flex-shrink: 0;
        }

        .icon-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-btn, .mic-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .send-btn {
          background: var(--primary);
          color: white;
        }

        .mic-btn {
          background: var(--bg-sidebar);
          color: var(--text-primary);
        }

        /* ✅ COMPACT SCREEN FIXES */
        @media (max-width: 991px) {
          .footer-inner {
            max-width: 100%;
            margin: 0;
          }
          .preview-wrap {
            max-width: 100%;
            margin: 0 0 8px 0;
          }
        }

        @media (max-width: 576px) {
          .chat-footer {
            padding: 8px 10px;
          }
          .footer-inner {
            gap: 6px;
          }
          textarea {
            padding: 8px 12px;
            font-size: 14px;
          }
          .send-btn, .mic-btn {
            width: 38px;
            height: 38px;
          }
        }

        .emoji-wrapper { position: relative; }
        .emoji-picker {
          position: absolute;
          bottom: 55px;
          left: 0;
          z-index: 100;
        }

        .reply-preview {
          padding: 12px 14px;
          background: linear-gradient(135deg, var(--bg-sidebar) 0%, rgba(52, 183, 241, 0.05) 100%);
          border-left: 3px solid var(--primary);
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .reply-preview:hover {
          background: linear-gradient(135deg, rgba(52, 183, 241, 0.08) 0%, rgba(52, 183, 241, 0.08) 100%);
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
        }

        .reply-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .reply-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--primary);
          text-transform: capitalize;
        }

        .reply-icon {
          flex-shrink: 0;
          opacity: 0.8;
        }

        .reply-sender {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 150px;
        }

        .reply-text {
          font-size: 13px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          line-height: 1.4;
        }

        .reply-close-btn {
          flex-shrink: 0;
          background: transparent;
          border: none;
          padding: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .reply-close-btn:hover {
          background: rgba(120, 120, 120, 0.1);
          color: var(--text-primary);
        }

        .media-preview {
          padding: 8px 12px;
          background: var(--bg-sidebar);
          font-size: 13px;
          color: var(--text-secondary);
          border-left: 3px solid var(--primary);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 8px;
        }

        .media-preview img {
          max-width: 80px;
          border-radius: 6px;
        }
      `}</style>

    </footer>
  );
};

const mapStateToProps = (state) => ({
  currentConversationId: state.chatReducer.currentConversationId,
  replyingTo: state.chatReducer.replyingTo
});

const mapDispatchToProps = {
  clearReply
};

export default connect(mapStateToProps, mapDispatchToProps)(ChatFooter);