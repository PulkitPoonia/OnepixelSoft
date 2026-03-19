import React, { useState, useMemo } from 'react';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  return url;
}

const ContactList = ({
  conversations,
  onConversationSelect,
  selectedConversationId
}) => {
  const [search, setSearch] = useState('');
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  // Memoize filtered conversations - exclude groups and deduplicate by user
  const filtered = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    
    // First filter for 1-on-1 chats only (exactly 2 participants)
    const oneOnOne = conversations.filter(c => {
      if (c.isGroup === true) return false;
      if (c.groupName) return false;
      if (c.participants && c.participants.length > 2) return false;
      return true;
    });
    
    // Deduplicate by username - keep most recent conversation per user
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
        const existing = seen.get(key);
        if (conv.updatedAt > existing.updatedAt) {
          seen.set(key, conv);
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) deduplicated[idx] = conv;
        }
      }
    });
    
    // Apply search filter
    return deduplicated.filter(c => {
      const other = c.participants?.find(p => p.username !== me.username);
      return (other?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
    });
  }, [conversations, search, me.username]);

  if (!Array.isArray(conversations)) {
    return <div className="contact-list">⏳ Loading chats...</div>;
  }

  if (filtered.length === 0 && conversations.length === 0) {
    return (
      <div className="contact-list">
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
      </div>
    );
  }

  return (
    <div className="contact-list">
      {/* SEARCH */}
      <div className="sidebar-search" style={{ padding: '12px' }}>
        <input
          placeholder="Search chats"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-header)',
            color: 'var(--text-primary)',
            fontSize: '14px'
          }}
        />
      </div>

      {/* LIST */}
      <SimpleBar style={{ height: 'calc(100% - 50px)' }}>
        {filtered.length === 0 ? (
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
            const other = c.participants?.find(
              p => p.username !== me.username
            );

            const active = c._id === selectedConversationId;
            const avatarUrl = getImageUrl(other?.profilePic || other?.avatar || null);
            const displayInitial = (other?.name || other?.username || '?')[0];

            return (
              <div
                key={c._id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  backgroundColor: active ? 'var(--bg-header)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => onConversationSelect(c._id)}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* AVATAR */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--theme-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '16px',
                    fontWeight: 'bold',
                    overflow: 'hidden'
                  }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      displayInitial
                    )}
                  </div>

                  {/* INFO */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      marginBottom: '4px'
                    }}>
                      {other?.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
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
                            const { fileName, type } = parsed;
                            if (type === 'pdf' || fileName?.toLowerCase().endsWith('.pdf')) {
                              return `📄 ${fileName}`;
                            } else if (type === 'image' || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
                              return `📷 ${fileName}`;
                            }
                            return `📎 ${fileName}`;
                          }
                        } catch {}
                        if (msg.text?.startsWith("data:image")) return "📷 Photo";
                        if (msg.text?.startsWith("data:audio")) return "🎵 Audio";
                        if (msg.text?.startsWith("data:application/pdf")) return "📄 Document";
                        return msg.text?.slice(0, 40) || "";
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </SimpleBar>
    </div>
  );
};

const mapStateToProps = ({ chatReducer }) => ({
  conversations: chatReducer.conversations || []
});

export default connect(mapStateToProps)(ContactList);
