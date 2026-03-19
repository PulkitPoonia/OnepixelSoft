import React, { useState, useEffect, useMemo } from 'react';
import SimpleBar from 'simplebar-react';
import { connect } from 'react-redux';
import { loadConversations } from '../../../redux/action/Chat';
import { userHasPermission } from '../../../utils/permissions';
import GroupModel from './GroupModel';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  if (url.startsWith('data:')) return url;
  return url;
}

const GroupList = ({
  conversations,
  onGroupSelect,
  selectedGroupId,
  loadConversations
}) => {
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [me, setMe] = useState(JSON.parse(localStorage.getItem('user') || '{}'));

  // Refresh user data on mount to get latest permissions
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('adminToken');
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setMe(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.error('Failed to refresh user data:', err);
      }
    };

    refreshUserData();
  }, []);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Filter conversations that are groups (isGroup flag set)
  const groups = useMemo(() => {
    if (!Array.isArray(conversations)) {
      return [];
    }
    const filtered = conversations.filter(c => c.isGroup === true);
    return filtered;
  }, [conversations]);

  // Filter and search
  const filtered = useMemo(() => {
    return groups.filter(g => {
      const groupName = g.groupName || g.participants.map(p => p.name || p.username).join(', ');
      return groupName.toLowerCase().includes(search.toLowerCase());
    });
  }, [groups, search]);

  return (
    <div className="group-list" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* CREATE GROUP BUTTON */}
      {userHasPermission(me, 'canCreateGroups') && (
        <div style={{ padding: '12px' }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            + Create Group
          </button>
        </div>
      )}

      {/* NO PERMISSION MESSAGE */}
      {!userHasPermission(me, 'canCreateGroups') && (
        <div style={{ padding: '12px' }}>
          <div style={{
            padding: '10px',
            backgroundColor: 'rgba(255,193,7,0.1)',
            border: '1px solid rgba(255,193,7,0.3)',
            borderRadius: '6px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            You don't have permission to create groups
          </div>
        </div>
      )}

      {/* SEARCH */}
      <div style={{ padding: '0 12px 12px' }}>
        <input
          placeholder="Search groups"
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
      <SimpleBar style={{ flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            {groups.length === 0 ? 'No groups yet' : 'No groups found'}
          </div>
        ) : (
          filtered.map(g => {
            const active = g._id === selectedGroupId;
            // Use groupName if available, otherwise show participant names
            const groupName = g.groupName || g.participants.map(p => p.name || p.username).join(', ');
            const members = g.participants.filter(p => p.username !== me.username);

            // DEBUG: Log messageCount for each group
            console.log('📊 GroupList rendering:', {
              groupName,
              messageCount: g.messageCount,
              hasMessageCount: 'messageCount' in g,
              lastMessage: g.lastMessage?.text?.slice(0, 20)
            });

            {g.groupProfilePic && console.log('🖼️ GroupList rendering group:', { name: groupName, hasPic: true, picLength: g.groupProfilePic.length })}
            
            return (
              <div
                key={g._id}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  backgroundColor: active ? 'var(--bg-header)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onClick={() => onGroupSelect(g._id)}
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
                    {g.groupProfilePic ? (
                      <img 
                        key={`pic-${g._id}`}
                        src={getImageUrl(g.groupProfilePic)}
                        alt={groupName} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          console.error('❌ GroupList: Error loading profile pic for', groupName);
                          e.target.parentElement.textContent = '👥';
                        }}
                      />
                    ) : (
                      '👥'
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
                      {groupName}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {(() => {
                        const msg = g.lastMessage;

                        if (!msg) return 'No messages yet';

                        if (msg.deletedForEveryone) {
                          return msg.senderId === me.username
                            ? 'You deleted this message'
                            : 'This message was deleted';
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
                        if (msg.text?.startsWith('data:image')) return '📷 Photo';
                        if (msg.text?.startsWith('data:audio')) return '🎵 Audio';
                        if (msg.text?.startsWith('data:application/pdf')) return '📄 Document';

                        // ✅ Normal text
                        return msg.text?.slice(0, 40) || 'No messages yet';
                      })()}
                    </div>
                  </div>

                  {/* UNREAD BADGE */}
                  {g.messageCount > 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      {g.messageCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </SimpleBar>

      {/* CREATE GROUP MODAL */}
      <GroupModel
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={() => {
          setShowCreateModal(false);
          loadConversations();
        }}
      />
    </div>
  );
};

const mapStateToProps = ({ chatReducer }) => ({
  conversations: chatReducer.conversations || []
});

export default connect(mapStateToProps, { loadConversations })(GroupList);

