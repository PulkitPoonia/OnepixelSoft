/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState, useRef } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import SimpleBar from 'simplebar-react';
import { horizontalMenu } from '../../utils/HorizontalNavInit';
import NavHeader from './NavHeader';
import { useTheme } from '../../utils/theme-provider/theme-provider';
import { NavMenu } from './NavMenu';
import classNames from 'classnames';
import { hasPermission, notifyNoPermission } from '../../utils/permissions';
import { LogOut, Moon, Sun, Bell } from 'react-feather';

const SILENT_WAV = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

import socketService from '../../utils/socketService';
import 'bootstrap/js/dist/collapse';
import { connect } from 'react-redux';

// Logo imports
import BrandLight from '../../assets/img/mylogowhite.png';
import BrandDark from '../../assets/img/mylogo.png';
import HkBadge from '../../components/@hk-badge/@hk-badge';

const CompactMenu = ({ closeMenu, conversations }) => {

    const chatMessageCount = conversations ? conversations.reduce((sum, c) => sum + (c.messageCount || 0), 0) : 0;

    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const [activeMenu, setActiveMenu] = useState();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('app_notifications') || '[]');
        } catch { return []; }
    });
    const [unreadCount, setUnreadCount] = useState(0);
    let navigate = useNavigate();

    // 🎧 Persistent Audio Player
    const audioPlayer = useRef(new Audio('/assets/audio/notification.mp3'));

    // Keep unread count in sync
    useEffect(() => {
        setUnreadCount(notifications.filter(n => !n.read).length);
    }, [notifications]);
    // 🔊 Audio Primer (Ensures browser context is unlocked/primed)
    useEffect(() => {
        const primeAudio = () => {
            console.log('🔊 Priming audio engine...');
            // Create a one-time-use player with silent base64 to "unlock" the context
            const unlocker = new Audio(SILENT_WAV);
            unlocker.play().then(() => {
                console.log('✅ Audio engine successfully unlocked');
                // Also prime the main player
                audioPlayer.current.load();
            }).catch(e => {
                console.warn('⚠️ Audio unlock attempt failed:', e.message);
            });
        };

        const events = ['mousedown', 'keydown', 'touchstart', 'click'];
        events.forEach(e => document.addEventListener(e, primeAudio, { once: true }));
        
        return () => {
            events.forEach(e => document.removeEventListener(e, primeAudio));
        };
    }, []);

    // Expose a global helper so other parts of the app can push notifications
    useEffect(() => {
        window._pushNotification = (notif) => {
            const entry = {
                id: Date.now(),
                read: false,
                time: new Date().toISOString(),
                ...notif
            };

            // 🎵 Play notification sound
            try {
                const player = audioPlayer.current;
                player.currentTime = 0;
                player.volume = 0.6;
                player.play().catch(() => {
                    // Fail silently - primer will catch it on first interaction
                });
            } catch (err) {
                console.error('❌ Sound logic error:', err);
            }

            setNotifications(prev => {
                const next = [entry, ...prev].slice(0, 30);
                localStorage.setItem('app_notifications', JSON.stringify(next));
                return next;
            });
        };
        return () => { delete window._pushNotification; };
    }, []);

    const openNotifications = () => {
        setShowNotifications(v => {
            if (!v) {
                // Mark all as read when opening
                setNotifications(prev => {
                    const next = prev.map(n => ({ ...n, read: true }));
                    localStorage.setItem('app_notifications', JSON.stringify(next));
                    return next;
                });
            }
            return !v;
        });
    };

    const clearNotifications = () => {
        setNotifications([]);
        localStorage.setItem('app_notifications', '[]');
        setShowNotifications(false);
    };

    const formatTime = (iso) => {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };


    /* ================= FILTER MENU BY PERMISSIONS ================= */
    const getFilteredMenu = () => {
        return NavMenu.map(group => ({
            ...group,
            // ✅ FIX: Filter menu items based on permissions
            contents: group.contents.filter(menu => {
                // Hide Users menu if user doesn't have permission
                if (menu.path === '/admin/users' && !hasPermission('users')) {
                    return false;
                }
                // Hide children that user doesn't have permission for
                if (menu.childrens) {
                    menu.childrens = menu.childrens.filter(child => {
                        if (child.path === '/admin/users' && !hasPermission('users')) {
                            return false;
                        }
                        return true;
                    });
                }
                return true;
            })
        })).filter(group => group.contents.length > 0); // Remove empty groups
    };

    /* ================= LOGOUT HANDLER ================= */
    const handleLogout = () => {
        // ✅ Disconnect socket with logout flag
        console.log('🔌 Logging out - disconnecting socket with logout event');
        socketService.disconnect(true); // Pass true to indicate intentional logout

        // Clear user data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('user');

        console.log('✅ Logout complete - navigating to login');
        navigate('/login');
    };

    /* ================= INIT MENU ================= */
    useEffect(() => {
        setTimeout(() => {
            horizontalMenu();
        }, 300);

        const handleWindowResize = () => {
            setTimeout(() => {
                horizontalMenu();
            }, 250);
        };

        window.addEventListener('resize', handleWindowResize);
        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, []);

    /* ================= HANDLE CLICK ================= */
    useEffect(() => {
        const handleDocClick = function (e) {
            const target = e.target.closest(".more-nav-item");
            const extra = e.target.closest(".extra-link");

            if (target && !extra) {
                e.preventDefault();
                const newTarget = e.target.closest(".nav-link");
                const href = newTarget && newTarget.getAttribute("href");

                if (href) {
                    navigate(href);
                    if (typeof closeMenu === 'function') closeMenu();
                }
            }
        };

        document.addEventListener("click", handleDocClick);
        return () => document.removeEventListener("click", handleDocClick);
    }, [navigate, closeMenu]);

    const handleClick = (menuName) => {
        setActiveMenu(menuName);
        if (typeof closeMenu === 'function') closeMenu();
    };

    const menuStyle = {
        background: 'var(--hk-menu-bg)',
        color: 'var(--hk-menu-text)'
    };

    return (
        <>
            {/* Mobile Sidebar */}
            <div
                style={menuStyle}
                className={classNames('hk-menu d-none d-xl-none', {
                    'sidebar-dark': theme === 'dark',
                    'sidebar-light': theme !== 'dark'
                })}
            >
                {/* Brand */}
                <NavHeader />

                {/* Main Menu */}
                <SimpleBar className="nicescroll-bar">
                    <div className="menu-content-wrap">
                        <Container fluid className="menu-group">
                            <Nav as="ul" className="navbar-nav flex-column">

                                {getFilteredMenu().map((routes, index) => (
                                    <React.Fragment key={index}>
                                        {routes.contents.map((menus, ind) => (

                                            <Nav.Item
                                                as='li'
                                                key={ind}
                                                className={classNames({
                                                    "active": !!menus.path && location.pathname.startsWith(menus.path)
                                                })}
                                            >

                                                {menus.childrens ? (
                                                    <>
                                                        {/* Parent */}
                                                        <Nav.Link
                                                            data-bs-toggle="collapse"
                                                            data-bs-target={`#${menus.id}`}
                                                        >
                                                            <span className={classNames("nav-link-text", {
                                                                "position-relative": menus.badgeIndicator
                                                            })}>
                                                                {menus.name}
                                                                {menus.badgeIndicator && menus.badgeIndicator}
                                                            </span>
                                                            {menus.badge && menus.badge}
                                                        </Nav.Link>

                                                        {/* Children */}
                                                        <Nav
                                                            as="ul"
                                                            id={menus.id}
                                                            className={classNames("nav flex-column nav-children", {
                                                                "collapse": activeMenu !== menus.name
                                                            })}
                                                        >
                                                            <Nav.Item as="li">
                                                                <ul className="nav flex-column">

                                                                    {menus.childrens.map((subMenu, indx) => (

                                                                        subMenu.childrens ? (

                                                                            <Nav.Item as="li" key={indx}>
                                                                                <Nav.Link
                                                                                    as={Link}
                                                                                    to="#"
                                                                                    className="nav-link"
                                                                                    data-bs-toggle="collapse"
                                                                                    data-bs-target={`#${subMenu.id}`}
                                                                                >
                                                                                    <span className="nav-link-text">
                                                                                        {subMenu.name}
                                                                                    </span>
                                                                                </Nav.Link>

                                                                                <Nav
                                                                                    as="ul"
                                                                                    id={subMenu.id}
                                                                                    className="flex-column collapse nav-children"
                                                                                >
                                                                                    <Nav.Item as="li">
                                                                                        <ul className="nav flex-column">

                                                                                            {subMenu.childrens.map((childrenPath, i) => (
                                                                                                <li className="nav-item" key={i}>
                                                                                                    <NavLink
                                                                                                        to={childrenPath.path}
                                                                                                        className={({ isActive }) =>
                                                                                                            "nav-link " + (isActive ? "active" : "")
                                                                                                        }
                                                                                                        onClick={(e) => {
                                                                                                            if (childrenPath.path === '/admin/users' && !hasPermission('users')) {
                                                                                                                e.preventDefault();
                                                                                                                return notifyNoPermission();
                                                                                                            }
                                                                                                            handleClick(childrenPath.name);
                                                                                                        }}
                                                                                                    >
                                                                                                        <span className="nav-link-text">
                                                                                                            {childrenPath.name}
                                                                                                        </span>
                                                                                                    </NavLink>
                                                                                                </li>
                                                                                            ))}

                                                                                        </ul>
                                                                                    </Nav.Item>
                                                                                </Nav>
                                                                            </Nav.Item>

                                                                        ) : (

                                                                            <Nav.Item key={indx}>
                                                                                <NavLink
                                                                                    to={subMenu.path}
                                                                                    className={({ isActive }) =>
                                                                                        "nav-link " + (isActive ? "active" : "")
                                                                                    }
                                                                                    onClick={(e) => {
                                                                                        if (subMenu.path === '/admin/users' && !hasPermission('users')) {
                                                                                            e.preventDefault();
                                                                                            return notifyNoPermission();
                                                                                        }
                                                                                        handleClick(subMenu.name);
                                                                                    }}
                                                                                >
                                                                                    <span className="nav-link-text">
                                                                                        {subMenu.name}
                                                                                    </span>
                                                                                </NavLink>
                                                                            </Nav.Item>

                                                                        )
                                                                    ))}

                                                                </ul>
                                                            </Nav.Item>
                                                        </Nav>
                                                    </>
                                                ) : (
                                                    <>
                                                        {routes.group === "Documentation" ? (
                                                            <Nav.Link href={menus.path} className="extra-link">
                                                                <span className="nav-link-text">{menus.name}</span>
                                                                {menus.badge && menus.badge}
                                                            </Nav.Link>
                                                        ) : (
                                                            <NavLink
                                                                to={menus.path}
                                                                className={({ isActive }) =>
                                                                    "nav-link " + (isActive ? "active" : "")
                                                                }
                                                                onClick={(e) => {
                                                                    if (menus.path === '/admin/users' && !hasPermission('users')) {
                                                                        e.preventDefault();
                                                                        return notifyNoPermission();
                                                                    }
                                                                    handleClick(menus.name);
                                                                }}
                                                            >
                                                                <span className="nav-link-text">{menus.name}</span>
                                                                {menus.badge && menus.badge}
                                                            </NavLink>
                                                        )}
                                                    </>
                                                )}

                                            </Nav.Item>
                                        ))}
                                    </React.Fragment>
                                ))}

                            </Nav>
                        </Container>
                    </div>

                    {/* Mobile Actions */}
                    <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: `2px solid var(--theme-primary)`,
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                color: 'var(--theme-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(var(--theme-primary-rgb, 0, 168, 132), 0.15)';
                                e.currentTarget.style.boxShadow = '0 0 8px rgba(var(--theme-primary-rgb, 0, 168, 132), 0.25)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                        >
                            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                border: 'none',
                                borderRadius: '6px',
                                backgroundColor: '#ff3b30',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#e22b20'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#ff3b30'}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </div>
                </SimpleBar>
            </div>

            {/* Desktop Horizontal Menu */}
            <div className="d-none d-xl-flex align-items-center" style={{ flex: 1, gap: '0px', paddingLeft: '12px' }}>
                {/* Logo */}
                <Link to="/dashboard" style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: '4px',
                    flexShrink: 0,
                    cursor: 'pointer'
                }}>
                    <img
                        src={theme === 'dark' ? BrandLight : BrandDark}
                        alt="brand"
                        style={{
                            height: '60px',
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </Link>

                {/* Horizontal Menu */}
                <Nav className="d-flex" style={{ gap: '0px', alignItems: 'center', flex: 1 }}>
                    {getFilteredMenu().map((routes) => (
                        routes.contents.map((menus) => (
                            <NavLink
                                key={menus.path}
                                to={menus.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '10px 14px',
                                    fontSize: '15px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: '500'
                                }}
                                onClick={() => {
                                    if (menus.permissions && !hasPermission(menus.permissions)) {
                                        return notifyNoPermission();
                                    }
                                }}
                            >
                                {menus.icon && <span style={{ fontSize: '16px' }}>{menus.icon}</span>}
                                <span>{menus.name}</span>
                                {menus.name === 'Chat' && chatMessageCount > 0 && (
                                    <HkBadge size="sm" bg="danger" soft className="ms-1">
                                        {chatMessageCount > 9 ? '9+' : chatMessageCount}
                                    </HkBadge>
                                )}
                                {menus.badge && menus.badge}
                            </NavLink>
                        ))
                    ))}
                </Nav>

                {/* Notification Bell */}
                <div style={{ position: 'relative', marginLeft: 'auto', marginRight: '4px' }}>
                    <button
                        onClick={openNotifications}
                        style={{
                            position: 'relative',
                            padding: '8px 10px',
                            border: '2px solid transparent',
                            borderRadius: '8px',
                            backgroundColor: 'transparent',
                            color: 'var(--hk-menu-text, #444)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.07)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                minWidth: '16px', height: '16px',
                                borderRadius: '999px',
                                backgroundColor: '#ff3b30',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: '700',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: '0 3px',
                                lineHeight: 1
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {/* Dropdown Panel */}
                    {showNotifications && (
                        <div style={{
                            position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                            width: '320px', maxHeight: '420px',
                            background: 'var(--hk-menu-bg, #fff)',
                            border: '1px solid rgba(0,0,0,0.12)',
                            borderRadius: '12px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                            zIndex: 9999,
                            overflow: 'hidden',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(0,0,0,0.08)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                            }}>
                                <strong style={{ fontSize: '14px' }}>Notifications</strong>
                                {notifications.length > 0 && (
                                    <button onClick={clearNotifications} style={{
                                        background: 'none', border: 'none',
                                        color: '#888', fontSize: '12px', cursor: 'pointer', padding: 0
                                    }}>Clear all</button>
                                )}
                            </div>
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '32px 16px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                                        <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                                        No notifications yet
                                    </div>
                                ) : notifications.map(n => (
                                    <div 
                                        key={n.id} 
                                        onClick={() => {
                                            if (n.link) {
                                                navigate(n.link);
                                                setShowNotifications(false);
                                            }
                                        }}
                                        style={{
                                            padding: '10px 16px',
                                            borderBottom: '1px solid rgba(0,0,0,0.05)',
                                            backgroundColor: n.read ? 'transparent' : 'rgba(var(--theme-primary-rgb,0,168,132),0.07)',
                                            display: 'flex', gap: '10px', alignItems: 'flex-start',
                                            cursor: n.link ? 'pointer' : 'default',
                                            transition: 'background-color 0.2s ease'
                                        }}
                                        onMouseEnter={e => {
                                            if (n.link) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                                        }}
                                        onMouseLeave={e => {
                                            if (n.link) e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(var(--theme-primary-rgb,0,168,132),0.07)';
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '20px', flexShrink: 0, lineHeight: 1.4
                                        }}>{n.icon || '🔔'}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '13px', fontWeight: n.read ? '400' : '600', color: 'var(--hk-menu-text, #222)', marginBottom: '2px' }}>
                                                {n.title}
                                            </div>
                                            {n.body && (
                                                <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</span>
                                                    <span 
                                                        title={n.isGroup ? "Group Chat" : "Direct Message"}
                                                        style={{
                                                            width: '8px',
                                                            height: '8px',
                                                            borderRadius: '50%',
                                                            backgroundColor: n.isGroup ? '#7367f0' : '#28c76f', // Purple for Group, Green for DM
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <div style={{ fontSize: '11px', color: '#bbb', marginTop: '3px' }}>{formatTime(n.time)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleTheme}
                    style={{
                        marginLeft: '4px',
                        marginRight: '8px',
                        padding: '8px 12px',
                        border: `2px solid var(--theme-primary)`,
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: 'var(--theme-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(var(--theme-primary-rgb, 0, 168, 132), 0.15)';
                        e.currentTarget.style.boxShadow = '0 0 8px rgba(var(--theme-primary-rgb, 0, 168, 132), 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                    }}
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                {/* Desktop Logout Button */}
                <button
                    onClick={handleLogout}
                    style={{
                        marginLeft: '8px',
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        backgroundColor: '#ff3b30',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'background 0.2s',
                        whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#e22b20'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#ff3b30'}
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>
        </>
    );
};

const mapStateToProps = ({ chatReducer }) => ({
    conversations: chatReducer.conversations || []
});

export default connect(mapStateToProps)(CompactMenu);
