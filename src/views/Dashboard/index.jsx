import React, { useEffect, useMemo } from 'react';
import { useTheme } from '../../utils/theme-provider/theme-provider';
import { Container, Row, Col } from 'react-bootstrap';
import { connect } from 'react-redux';
import { toggleCollapsedNav } from '../../redux/action/Theme';
import { loadConversations } from '../../redux/action/Chat';
import { loadProjectsFromDatabase } from '../../redux/action/ToDo';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  return url;
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

const Dashboard = ({ navCollapsed, toggleCollapsedNav, conversations, projects, loadConversations, loadProjectsFromDatabase }) => {
    const { theme } = useTheme();
  const me = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  useEffect(() => {
    toggleCollapsedNav(false);
    loadConversations();
    loadProjectsFromDatabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Active Users ──────────────────────────────────────────────
  const activeUsers = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const conv of conversations) {
      for (const p of conv.participants || []) {
        if (p.username !== me.username && !seen.has(p.username)) {
          seen.add(p.username);
          list.push({ ...p, isOnline: !!p.online, lastSeen: p.lastSeen || null });
        }
      }
    }
    // Online first
    return list.sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0));
  }, [conversations, me.username]);

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
              <h1 className="db-title">Dashboard</h1>
              <p className="db-subtitle">
                Welcome back, <strong>{me.name || me.username || 'User'}</strong>! Here's what's happening today.
              </p>
            </div>
            <div className="db-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>

          {/* ── Summary Cards ─────────────────────────── */}
          <Row className="g-3 mb-4">
            {[
              { label: 'Online Users', value: onlineCount, icon: '🟢', sub: `of ${activeUsers.length} users`, color: '#22c55e', link: null },
              { label: 'Pending Tasks', value: pendingCount, icon: '📋', sub: `across ${projects.length} projects`, color: '#f59e0b', link: '/apps/todo/task-list' },
              { label: 'Direct Chats', value: directChats.length, icon: '💬', sub: totalUnreadChats > 0 ? `${totalUnreadChats} unread` : 'All caught up', color: '#3b82f6', link: '/apps/chat/chats' },
              { label: 'Group Chats', value: groups.length, icon: '👥', sub: totalUnreadGroups > 0 ? `${totalUnreadGroups} unread` : 'All caught up', color: '#a855f7', link: '/apps/chat/chat-groups' },
            ].map(card => (
              <Col key={card.label} xs={6} lg={3}>
                <div
                  className="db-stat-card"
                  style={{ '--card-color': card.color }}
                  onClick={() => card.link && (window.location.href = card.link)}
                >
                  <div className="db-stat-icon">{card.icon}</div>
                  <div className="db-stat-value">{card.value}</div>
                  <div className="db-stat-label">{card.label}</div>
                  <div className="db-stat-sub">{card.sub}</div>
                </div>
              </Col>
            ))}
          </Row>

          {/* ── Middle Row: Active Users + Tasklist ────── */}
          <Row className="g-3 mb-3">
            {/* Active Users */}
            <Col xs={12} lg={4}>
              <div className="db-card" style={{ height: '100%' }}>
                <div className="db-card-header">
                  <span className="db-card-title">🟢 Active Users</span>
                  <span className="db-card-badge">{onlineCount} online</span>
                </div>
                <div className="db-card-body db-scroll">
                  {activeUsers.length === 0 ? (
                    <div className="db-empty">No users yet</div>
                  ) : (
                    activeUsers.map(user => {
                      const avatarUrl = getImageUrl(user.profilePic || user.avatar || null);
                      return (
                        <div key={user.username} className="db-user-row">
                          <div className="db-avatar-wrap">
                            <div className={`db-avatar ${user.isOnline ? 'db-avatar--online' : ''}`}>
                              {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitial(user.name || user.username)}
                            </div>
                            <span className={`db-online-dot ${user.isOnline ? 'db-online-dot--on' : 'db-online-dot--off'}`} />
                          </div>
                          <div className="db-user-info">
                            <span className="db-user-name">{user.name || user.username}</span>
                            <span className="db-user-sub">
                              {user.isOnline ? 'Online now' : user.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : 'Offline'}
                            </span>
                          </div>
                          <div className={`db-status-badge ${user.isOnline ? 'db-status-badge--on' : 'db-status-badge--off'}`}>
                            {user.isOnline ? 'Online' : 'Offline'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Col>

            {/* Tasklist */}
            <Col xs={12} lg={8}>
              <div className="db-card" style={{ height: '100%' }}>
                <div className="db-card-header">
                  <span className="db-card-title">📋 Tasklist</span>
                  <Link to="/apps/todo/task-list" className="db-card-link">View all →</Link>
                </div>
                <div className="db-card-body db-scroll">
                  {allTasks.length === 0 ? (
                    <div className="db-empty">No tasks found. Ask your admin to create a project!</div>
                  ) : (
                    allTasks.slice(0, 10).map(task => (
                      <div key={task._id || task.id} className="db-task-row">
                        <div className="db-task-status-line" style={{ background: getStatusColor(task.status) }} />
                        <div className="db-task-info">
                          <span className="db-task-title">{task.title}</span>
                          <span className="db-task-proj">{task.projectName}</span>
                        </div>
                        <div className="db-task-badges">
                          <span className="db-task-badge" style={{ background: getStatusColor(task.status) + '22', color: getStatusColor(task.status), border: `1px solid ${getStatusColor(task.status)}55` }}>
                            {task.status}
                          </span>
                          {task.deadline && (
                            <span className="db-task-deadline">
                              📅 {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* ── Bottom Row: Chats + Groups ────────────── */}
          <Row className="g-3 mb-4">
            {/* Recent Direct Chats */}
            <Col xs={12} lg={6}>
              <div className="db-card">
                <div className="db-card-header">
                  <span className="db-card-title">💬 Recent Chats</span>
                  <Link to="/apps/chat/chats" className="db-card-link">Open →</Link>
                </div>
                <div className="db-card-body db-scroll">
                  {directChats.length === 0 ? (
                    <div className="db-empty">No chats yet. Start a conversation!</div>
                  ) : (
                    directChats.slice(0, 8).map(conv => {
                      const other = (conv.participants || []).find(p => p.username !== me.username);
                      if (!other) return null;
                      const avatarUrl = getImageUrl(other.profilePic || other.avatar || null);
                      const hasUnread = (conv.messageCount || 0) > 0;
                      return (
                        <Link
                          key={conv._id}
                          to={`/apps/chat/chats?conversation=${conv._id}`}
                          className="db-chat-row"
                        >
                          <div className="db-avatar-wrap">
                            <div className={`db-avatar ${other.online ? 'db-avatar--online' : ''}`}>
                              {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitial(other.name || other.username)}
                            </div>
                            {other.online && <span className="db-online-dot db-online-dot--on" />}
                          </div>
                          <div className="db-chat-info">
                            <span className="db-chat-name">{other.name || other.username}</span>
                            <span className="db-chat-last">{getLastMessageText(conv.lastMessage, me.username)}</span>
                          </div>
                          {hasUnread && (
                            <span className="db-unread-badge">{conv.messageCount}</span>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </Col>

            {/* Recent Groups */}
            <Col xs={12} lg={6}>
              <div className="db-card">
                <div className="db-card-header">
                  <span className="db-card-title">👥 Group Chats</span>
                  <Link to="/apps/chat/chat-groups" className="db-card-link">Open →</Link>
                </div>
                <div className="db-card-body db-scroll">
                  {groups.length === 0 ? (
                    <div className="db-empty">No groups yet. Create a group chat!</div>
                  ) : (
                    groups.slice(0, 8).map(g => {
                      const groupName = g.groupName || (g.participants || []).map(p => p.name || p.username).join(', ');
                      const avatarUrl = getImageUrl(g.groupProfilePic || null);
                      const hasUnread = (g.messageCount || 0) > 0;
                      return (
                        <Link
                          key={g._id}
                          to={`/apps/chat/chat-groups?conversation=${g._id}`}
                          className="db-chat-row"
                        >
                          <div className="db-avatar db-avatar--group">
                            {avatarUrl ? <img src={avatarUrl} alt="" /> : '👥'}
                          </div>
                          <div className="db-chat-info">
                            <span className="db-chat-name">{groupName}</span>
                            <span className="db-chat-last">{getLastMessageText(g.lastMessage, me.username)}</span>
                          </div>
                          {hasUnread && (
                            <span className="db-unread-badge">{g.messageCount}</span>
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
  projects: toDoReducer.projects || [],
});

export default connect(mapStateToProps, {
  toggleCollapsedNav,
  loadConversations,
  loadProjectsFromDatabase,
})(Dashboard);