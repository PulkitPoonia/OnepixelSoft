import React, { useState, useMemo } from 'react';
import debugger_ from '../../../utils/debugger';
import { API_BASE } from '../../../config';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  return url;
}

import InvitePeopleModal from '../InvitePeopleModal';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';

const ContactList = ({
  conversations,
  onConversationSelect,
  selectedConversationId
}) => {

  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  // ✅ Memoize filtered and deduplicated conversations
  const filtered = useMemo(() => {
    // Filter: Remove groups and keep only 1-on-1 chats
    const oneOnOne = conversations.filter(c => {
      // Skip if explicitly marked as group
      if (c.isGroup === true) return false;
      // Skip if has groupName
      if (c.groupName) return false;
      // Skip if has multiple participants (2+ = group)
      if (c.participants && c.participants.length > 2) return false;
      return true;
    });
    
    // Deduplicate: Keep only most recent per user
    const seen = new Map();
    const deduplicated = [];
    
    oneOnOne.forEach(conv => {
      const other = conv.participants?.find(p => p.username !== me.username);
      if (!other) return;
      
      const key = other.username;
      if (!seen.has(key)) {
        seen.set(key, conv);
        deduplicated.push(conv);
      } else {
        // Keep the more recent one
        const existing = seen.get(key);
        if (conv.updatedAt > existing.updatedAt) {
          seen.set(key, conv);
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) {
            deduplicated[idx] = conv;
          }
        }
      }
    });
    
    // Now apply search filter
    return deduplicated.filter(c => {
      const other = c.participants.find(p => p.username !== me.username);
      return (other?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [conversations, search, me.username]);

  return (
    <div className="sidebar">

      {/* INVITE */}
      <div className="sidebar-invite">
        <button
          className="invite-btn"
          onClick={() => setShowInviteModal(true)}
        >
          + Invite People
        </button>
      </div>

      <InvitePeopleModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={() => {}}
      />

      {/* SEARCH */}
      <div className="sidebar-search">
        <input
          placeholder="Search or start new chat"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LIST */}
      <SimpleBar className="sidebar-scroll">
        {filtered.length === 0 && conversations.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            ⏳ Loading chats...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            No chats found
          </div>
        ) : (
          filtered.map(c => {
            const other = c.participants.find(
              p => p.username !== me.username
            );

            debugger_.verbose_log('Rendering conversation:', { name: other?.name, lastMessage: c.lastMessage?.text?.slice(0, 30) });

            const active = c._id === selectedConversationId;
            const avatarUrl = getImageUrl(other?.profilePic || other?.avatar || null);
            const displayInitial = (other?.name || other?.username || '?')[0];

            return (
              <div
                key={c._id}
                className={`chat-item ${active ? 'active' : ''}`}
                onClick={() => onConversationSelect(c._id)}
              >
                {/* AVATAR */}
                <div className="avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" />
                ) : (
                  displayInitial
                )}
              </div>

              {/* INFO */}
              <div className="info">
                <div className="top">
                  <span className="name">{other?.name}</span>
                </div>

                <div className="bottom">
  {(() => {
    const msg = c.lastMessage;

    if (!msg) return "No messages yet";

    
    if (msg.deletedForEveryone) {
      return msg.senderId === me.username
        ? "You deleted this message"
        : "This message was deleted";
    }

    // ✅ Handle file format (both fileId from DB and fileUrl for legacy)
    try {
      const parsed = JSON.parse(msg.text);
      if (parsed && typeof parsed === 'object' && (parsed.fileId || parsed.fileUrl) && parsed.fileName) {
        const { fileName, type, duration } = parsed;
        if (type === 'audio' || /\.(webm|mp3|wav|ogg|m4a)$/i.test(fileName)) {
          const durationStr = duration ? ` (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})` : '';
          return `🎤 Voice message${durationStr}`;
        } else if (type === 'pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
          return `📄 ${fileName}`;
        } else if (type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
          return `📷 ${fileName}`;
        }
        return `📎 ${fileName}`;
      }
    } catch {}

    // Old base64 formats
    if (msg.text?.startsWith("data:image")) return "📷 Photo";
    if (msg.text?.startsWith("data:audio")) return "🎵 Audio";
    if (msg.text?.startsWith("data:application/pdf")) return "📄 Document";

    // ✅ Normal text
    return msg.text?.slice(0, 50) || "";
  })()}
</div>
              </div>

              {/* UNREAD */}
              {c.messageCount > 0 && (
                <div className="badge">
                  {c.messageCount}
                </div>
              )}
            </div>
          );
        })
        )}
      </SimpleBar>

      {/* STYLES */}
      <style>{`

        .sidebar {
          width: 100%;       
          max-width: 340px;  
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-sidebar);
          border-right: 1px solid var(--border);
          overflow-x: hidden; 
        }

        /* ✅ Made Invite Section Compact */
        .sidebar-invite {
          padding: 12px 12px 6px 12px;
        }

        .invite-btn {
          width: 100%;
          padding: 8px;
          border-radius: 6px;
          border: none;
          background: var(--primary);
          color: #fff;
          font-weight: 500;
          font-size: 13px; /* Smaller text */
          cursor: pointer;
          transition: 0.2s;
        }

        .invite-btn:hover {
          transform: scale(1.02);
        }

        /* ✅ Made Search Section Compact */
        .sidebar-search {
          padding: 4px 12px 12px 12px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-search input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: none;
          outline: none;
          background: var(--bg-header);
          color: var(--text-primary);
          font-size: 13px; /* Smaller text */
        }

        /* SCROLL */
        .sidebar-scroll {
          flex: 1;
        }

        /* ✅ Kill SimpleBar Horizontal Scroll */
        .simplebar-content-wrapper {
          overflow-x: hidden !important;
        }
        .simplebar-track.simplebar-horizontal {
          display: none !important;
          visibility: hidden !important;
        }

        /* ITEM */
        .chat-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          cursor: pointer;
          transition: 0.2s;
          position: relative;
        }

        .chat-item:hover {
          background: var(--bg-header);
        }

        .chat-item.active {
          background: var(--bg-header);
        }

        /* AVATAR */
        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 15px;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* INFO */
        .info {
          flex: 1;
          min-width: 0;
        }

        .name {
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis; 
          display: block;
        }

        .bottom {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis; 
          margin-top: 2px;
        }

        /* BADGE */
        .badge {
          background: var(--primary);
          color: white;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 12px;
          font-weight: 600;
        }

      `}</style>

    </div>
  );
};

export default ContactList;