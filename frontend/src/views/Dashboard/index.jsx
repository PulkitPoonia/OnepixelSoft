import React, { useEffect, useMemo } from 'react';
import socketService from '../../utils/socketService';
import { useTheme } from '../../utils/theme-provider/theme-provider';
import { Container, Row, Col } from 'react-bootstrap';
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../redux/action/Theme';
import { loadConversations, loadAllUsers } from '../../redux/action/Chat';
import { loadProjectsFromDatabase } from '../../redux/action/ToDo';
import { Link, useNavigate } from 'react-router-dom';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onepixelsoft.onrender.com';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const cleanPath = url.replace(/\\/g, '/').replace(/^\//, '');
  return `${API_BASE.replace('/api', '')}/${cleanPath}`;
}

function getInitial(name) {
  return (name || '?')[0].toUpperCase();
}

function getStatusColor(status) {
  const map = {
    'To Do': '#6c757d',
    'In Progress': '#f0a500',
    'In Review': '#17a2b8',
    'Done': '#28a745',
    'Blocked': '#dc3545',
    'On Hold': '#adb5bd',
  };
  return map[status] || '#6c757d';
}

function formatLastSeen(lastSeen) {
  if (!lastSeen) return '';
  const d = new Date(lastSeen);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString();
}

function getLastMessageText(msg, meUsername) {
  if (!msg) return 'No messages yet';
  if (msg.deletedForEveryone) {
    return msg.senderId === meUsername ? 'You deleted this message' : 'This message was deleted';
  }
  try {
    const parsed = JSON.parse(msg.text);
    if (parsed && (parsed.fileId || parsed.fileUrl) && parsed.fileName) {
      const { type, duration, fileName } = parsed;
      if (type === 'audio') {
        const d = duration ? ` (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})` : '';
        return `🎤 Voice message${d}`;
      }
      if (type === 'image') return `📷 ${fileName}`;
      if (type === 'pdf') return `📄 ${fileName}`;
      return `📎 ${fileName}`;
    }
  } catch { }
  if (msg.text?.startsWith('data:image')) return '📷 Photo';
  if (msg.text?.startsWith('data:audio')) return '🎵 Audio';
  return msg.text?.slice(0, 50) || '';
}

const Dashboard = ({ navCollapsed, toggleCollapsedNav, conversations, allUsers, projects, loadConversations, loadAllUsers, loadProjectsFromDatabase }) => {
    const { theme } = useTheme();
    const navigate = useNavigate();
  const me = useMemo(() => {
    try { 
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const role = localStorage.getItem('role') || (u.role === 'admin' || u.admin === true ? 'admin' : 'user');
      return { ...u, role, isAdmin: role === 'admin' };
    } catch { return { role: 'user', isAdmin: false }; }
  }, []);

  useEffect(() => {
    toggleCollapsedNav(false);
    loadConversations();
    loadProjectsFromDatabase();

    // Fetch all users if admin
    if (me.isAdmin) {
      loadAllUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.isAdmin]);

  // ── Active Users ──────────────────────────────────────────────
  const activeUsers = useMemo(() => {
    let baseList = [];
    if (me.isAdmin && allUsers.length > 0) {
      baseList = allUsers.map(u => ({
        ...u,
        isOnline: !!u.online,
        lastSeen: u.lastSeen || null
      }));
    } else {
      const seen = new Set();
      for (const conv of conversations) {
        for (const p of conv.participants || []) {
          if (!seen.has(p.username)) {
            seen.add(p.username);
            baseList.push({ ...p, isOnline: !!p.online, lastSeen: p.lastSeen || null });
          }
        }
      }
    }

    // Filter out current user and sort (online first, then alphabetical)
    return baseList
      .filter(u => u.username !== me.username)
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
        return (a.name || a.username).localeCompare(b.name || b.username);
      });
  }, [conversations, me.username, me.isAdmin, allUsers]);

  const onlineCount = useMemo(() => activeUsers.filter(u => u.isOnline).length, [activeUsers]);

  // ── Tasks ──────────────────────────────────────────────────────
  const allTasks = useMemo(() => {
    const tasks = [];
    for (const proj of projects) {
      for (const task of proj.tasks || []) {
        tasks.push({ ...task, projectName: proj.name, projectId: proj._id });
      }
    }
    const priority = ['Blocked', 'In Progress', 'In Review', 'To Do', 'On Hold', 'Done'];
    return tasks.sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
  }, [projects]);

  const pendingCount = useMemo(() => allTasks.filter(t => t.status !== 'Done').length, [allTasks]);

  // ── Chats ──────────────────────────────────────────────────────
  const directChats = useMemo(() =>
    conversations.filter(c => !c.isGroup && !c.groupName && (c.participants || []).length <= 2),
    [conversations]
  );

  const totalUnreadChats = useMemo(() =>
    directChats.reduce((acc, c) => acc + (c.messageCount || 0), 0),
    [directChats]
  );

  // ── Groups ──────────────────────────────────────────────────────
  const groups = useMemo(() => conversations.filter(c => c.isGroup === true), [conversations]);
  const totalUnreadGroups = useMemo(() =>
    groups.reduce((acc, g) => acc + (g.messageCount || 0), 0),
    [groups]
  );

  return (
    <>
      <div className="db-root" data-bs-theme={theme}>
        <Container fluid className="db-container">
          {/* ── Header ───────────────────────────────── */}
          <div className="db-header">
            <div>
                Hello <strong>{me.name || me.username || 'User'}</strong>, welcome to your workspace dashboard.
           
            </div>
            <div className="db-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>

          {/* ── Summary Cards ─────────────────────────── */}
          <Row className="g-3 mb-4">
            {[
              { label: 'Active Team', value: activeUsers.length, icon: '🚀', sub: `${onlineCount} currently online`, color: 'linear-gradient(135deg, #22c55e, #10b981)', link: me.isAdmin ? '/admin/users' : null },
              { label: 'Open Tasks', value: pendingCount, icon: '⚡', sub: `Syncing ${projects.length} projects`, color: 'linear-gradient(135deg, #f59e0b, #d97706)', link: '/apps/todo/task-list' },
              { label: 'Unread Chats', value: totalUnreadChats, icon: '🔥', sub: `${directChats.length} conversations`, color: 'linear-gradient(135deg, #3b82f6, #2563eb)', link: '/apps/chat/chats' },
              { label: 'Communities', value: groups.length, icon: '💎', sub: `${totalUnreadGroups} new notifications`, color: 'linear-gradient(135deg, #a855f7, #7c3aed)', link: '/apps/chat/chat-groups' },
            ].map(card => (
              <Col key={card.label} xs={12} sm={6} lg={3}>
                <div
                  className="db-stat-card-premium"
                  onClick={() => card.link && navigate(card.link)}
                >
                  <div className="db-stat-icon-wrap" style={{ background: card.color }}>
                    <span className="db-stat-icon-inner">{card.icon}</span>
                  </div>
                  <div className="db-stat-content">
                    <div className="db-stat-label-modern">{card.label}</div>
                    <div className="db-stat-value-modern" style={{ color: card.color }}>{card.value}</div>
                    <div className="db-stat-sub-modern">{card.sub}</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {/* ── Middle Row: Active Users + Tasklist ────── */}
          <Row className="g-3 mb-4">
            {/* Active Users */}
            <Col xs={12} lg={5}>
              <div className="db-card-premium">
                <div className="db-card-header-premium">
                  <div>
                    <h3 className="db-card-title-premium">Team Members</h3>
                    <p className="db-card-subtitle-premium">Connected colleagues</p>
                  </div>
                  <div className="db-card-actions">
                    {onlineCount > 0 && (
                      <span className="db-status-pill">
                        <span className="db-status-pill-dot" />
                        {onlineCount} Online
                      </span>
                    )}
                    {me.isAdmin && <Link to="/admin/users" className="db-card-link-premium">Manage</Link>}
                  </div>
                </div>
                <div className="db-card-body-premium db-scroll-premium">
                  {activeUsers.length === 0 ? (
                    <div className="db-empty-premium">
                      <div className="db-empty-icon">👥</div>
                      <p>Your team members will appear here.</p>
                    </div>
                  ) : (
                    <div className="db-member-grid">
                      {activeUsers.map(user => {
                        const avatarUrl = getImageUrl(user.profilePic || user.avatar || null);
                        const isUserOnline = !!user.isOnline;
                        return (
                          <div key={user.username} className="db-member-card">
                            <div className="db-member-avatar-wrap">
                              <div className={`db-member-avatar ${isUserOnline ? 'is-online' : ''}`}>
                                {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitial(user.name || user.username)}
                              </div>
                              <span className={`db-member-dot ${isUserOnline ? 'is-online' : ''}`} />
                            </div>
                            <div className="db-member-info">
                              <span className="db-member-name">{user.name || user.username}</span>
                              <span className="db-member-status">
                                {isUserOnline ? 'Active' : user.lastSeen ? formatLastSeen(user.lastSeen) : 'Away'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Col>

                {/* Tasklist */}
            <Col xs={12} lg={7}>
              <div className="db-card-premium">
                <div className="db-card-header-premium">
                  <div>
                    <h3 className="db-card-title-premium">Project Tasks</h3>
                   
                  </div>
                  <Link to="/apps/todo/task-list" className="db-card-link-premium">View all →</Link>
                </div>
                <div className="db-card-body-premium db-scroll-premium">
                  {allTasks.length === 0 ? (
                    <div className="db-empty-premium">
                      <div className="db-empty-icon">📝</div>
                      <p>No tasks found. Your projects are clear!</p>
                    </div>
                  ) : (
                    allTasks.map(task => (
                      <div
                        key={task._id}
                        className="db-task-row"
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/apps/todo/task-list?projectId=${task.projectId}&taskId=${task._id}`)}
                      >
                        <div
                          className="db-task-status-line"
                          style={{ background: task.status === 'Done' ? '#22c55e' : task.status === 'In Progress' ? '#3b82f6' : '#f59e0b' }}
                        />
                        <div className="db-task-info">
                           <span className="db-task-proj">{task.projectName}</span>
                           <span className="db-task-title">{task.title}</span>
                         </div>
                        <div className="db-task-badges">
                          <span className="db-task-badge">{task.status}</span>
                          {task.deadline && (
                            <div className="db-task-deadline">
                              {new Date(task.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* ── Bottom Row: Recent Chats + Groups ─────── */}
          <Row className="g-3">
            {/* Recent Chats */}
            <Col xs={12} lg={6}>
              <div className="db-card-premium">
                <div className="db-card-header-premium">
                  <div>
                    <h3 className="db-card-title-premium">Recent Chats</h3>
                    <p className="db-card-subtitle-premium">Latest messages</p>
                  </div>
                  <Link to="/apps/chat/chats" className="db-card-link-premium">Open →</Link>
                </div>
                <div className="db-card-body-premium">
                  {directChats.length === 0 ? (
                    <div className="db-empty-premium">No messages yet</div>
                  ) : (
                    directChats.slice(0, 4).map(chat => {
                      const other = (chat.participants || []).find(p => p.username !== me.username) || {};
                      const avatarUrl = getImageUrl(other.profilePic || other.avatar || null);
                      return (
                        <Link key={chat._id} to={`/apps/chat/chats?conversation=${chat._id}`} className="db-chat-row">
                          <div className="db-member-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                            {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitial(other.name || other.username)}
                          </div>
                          <div className="db-chat-info">
                            <span className="db-chat-name">{other.name || other.username}</span>
                            <span className="db-chat-last">
                              {chat.lastMessage?.text || (chat.lastMessage ? 'Sent an attachment' : 'No messages yet')}
                            </span>
                          </div>
                          {chat.messageCount > 0 && (
                            <div className="db-unread-badge">{chat.messageCount}</div>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </Col>

            {/* Group Chats */}
            <Col xs={12} lg={6}>
              <div className="db-card-premium">
                <div className="db-card-header-premium">
                  <div>
                    <h3 className="db-card-title-premium">Active Communities</h3>
                    <p className="db-card-subtitle-premium">Group discussions</p>
                  </div>
                  <Link to="/apps/chat/chat-groups" className="db-card-link-premium">Open →</Link>
                </div>
                <div className="db-card-body-premium">
                  {groups.length === 0 ? (
                    <div className="db-empty-premium">No groups joined</div>
                  ) : (
                    groups.slice(0, 4).map(group => {
                      const avatarUrl = getImageUrl(group.groupProfilePic || null);
                      return (
                        <Link key={group._id} to={`/apps/chat/chat-groups?conversation=${group._id}`} className="db-chat-row">
                          <div className="db-member-avatar" style={{ width: 40, height: 40, fontSize: 14, background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}>
                            {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitial(group.groupName)}
                          </div>
                          <div className="db-chat-info">
                            <span className="db-chat-name">{group.groupName}</span>
                            <span className="db-chat-last">
                              {group.lastMessage?.text || (group.lastMessage ? 'Sent an attachment' : 'Recent activity')}
                            </span>
                          </div>
                          {group.messageCount > 0 && (
                            <div className="db-unread-badge">{group.messageCount}</div>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
};

const mapStateToProps = ({ theme, chatReducer, toDoReducer }) => ({
  navCollapsed: theme.navCollapsed,
  conversations: chatReducer.conversations || [],
  allUsers: chatReducer.allUsers || [],
  projects: toDoReducer.projects || [],
});

export default connect(mapStateToProps, {
  toggleCollapsedNav,
  loadConversations,
  loadAllUsers,
  loadProjectsFromDatabase,
})(Dashboard);