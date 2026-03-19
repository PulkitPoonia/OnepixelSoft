import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { ChevronLeft, Phone, Settings } from 'react-feather';
import { useWindowWidth } from '@react-hook/window-size';
import { connect } from 'react-redux';
import { toggleTopNav } from '../../redux/action/Theme';
import { StartConversation } from '../../redux/action/Chat';
import AudioCallModal from './AudioCallModal';
import IncomingCallNotification from './IncomingCallNotification';
import RingingModal from './RingingModal';
import GroupSettingsModal from './GroupSettingsModal';
import socketService from '../../utils/socketService';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  if (url.startsWith('data:')) return url;
  return url;
}

const ChatHeader = ({
    toggleTopNav,
    StartConversation,
    startChating,
    conversations,
    currentConversationId,
    userId,
    currentUserName,
    incomingCall,
    callAcceptedByRecipient
}) => {

    const conversation = (conversations || []).find(
        c => String(c._id) === String(currentConversationId)
    );

    let other = null;
    let myUsername = '';

    try {
        myUsername = JSON.parse(localStorage.getItem('user') || '{}').username || '';
    } catch {}

    if (conversation && conversation.participants) {
        other = conversation.participants.find(p => p.username !== myUsername);
    }

    const isGroupChat = conversation?.isGroup || conversation?.groupName || (conversation?.participants?.length > 2);
    
    let avatar = other?.profilePic || '';
    let userName = other?.name || other?.username || '';
    let isOnline = other?.online;
    let lastSeen = other?.lastSeen;
    
    // For group chats, use group info
    if (isGroupChat) {
        avatar = conversation?.groupProfilePic || '';
        userName = conversation?.groupName || 'Group Chat';
        isOnline = false; // Groups don't have online status
        lastSeen = null;
        
        // Show member count instead of online status
        const memberCount = conversation?.participants?.length || 0;
        lastSeen = `${memberCount} members`;
    }
    
    const avatar_url = getImageUrl(avatar);
    const userName_display = userName;
    const isOnline_status = isOnline;
    const lastSeen_display = lastSeen;

    const [audioCall, setAudioCall] = useState(false);
    const [ringingCall, setRingingCall] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);

    const width = useWindowWidth();

    useEffect(() => {
        if (callAcceptedByRecipient && ringingCall) {
            setRingingCall(false);
            setAudioCall(true);
        }
    }, [callAcceptedByRecipient]);

    const formatLastSeen = (timestamp) => {
        if (!timestamp) return 'recently';

        const date = new Date(timestamp);
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        return date.toLocaleDateString();
    };

    const BackToContactList = () => {
        StartConversation(!startChating);
        toggleTopNav();
    };

    const handleCall = () => {
        const currentConv = conversations?.find(
            c => (c._id || c.conversationId) === currentConversationId
        );

        if (!currentConv || !currentConv.participants) return;

        const recipient = currentConv.participants.find(
            p => p._id !== userId
        );

        if (!recipient?._id) return;

        socketService.emit('initiate_call', {
            from: userId,
            to: recipient._id,
            fromName: currentUserName
        });

        setRingingCall(true);
    };

    if (!userName_display) {
        return (
            <header className="chat-header empty">
                <div className="center">
                    <h6>Select a conversation</h6>
                </div>
            </header>
        );
    }

    return (
        <>
            <header className="chat-header">

                <div className="left">
                    <Button
                        variant="link"
                        className="back-btn d-lg-none"
                        onClick={BackToContactList}
                    >
                        <ChevronLeft size={20} />
                    </Button>

                    <div className="user">
                        <div className="avatar">
                            {avatar_url ? (
                                <img 
                                  src={avatar_url} 
                                  alt="user" 
                                  onError={(e) => {
                                    console.error('❌ ChatHeader: Failed to load avatar');
                                    e.target.style.display = 'none';
                                  }}
                                />
                            ) : (
                                userName_display?.charAt(0)
                            )}
                            {!isGroupChat && <span className={`status-dot ${isOnline_status ? 'online' : 'offline'}`} />}
                        </div>

                        <div className="info">
                            <div className="name">{userName_display}</div>
                            <div className="status">
                                {isGroupChat
                                    ? lastSeen_display
                                    : isOnline_status
                                        ? 'online'
                                        : lastSeen_display
                                            ? `last seen ${formatLastSeen(lastSeen_display)}`
                                            : 'offline'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="right">
                    {isGroupChat && (
                        <button className="icon-btn me-2" onClick={() => setShowGroupSettings(true)} title="Group Settings">
                            <Settings size={18} />
                        </button>
                    )}
                    {!isGroupChat && (
                        <button className="icon-btn" onClick={handleCall}>
                            <Phone size={18} />
                        </button>
                    )}
                </div>

            </header>

            <AudioCallModal show={audioCall} hide={() => setAudioCall(false)} />

            {incomingCall && (
                <IncomingCallNotification
                    show={true}
                    userId={incomingCall.from}
                    userName={incomingCall.fromName}
                    avatar={incomingCall.avatar}
                    onAccept={() => setAudioCall(true)}
                />
            )}

            <RingingModal
                show={ringingCall}
                userName={userName}
                avatar={avatar}
                onDecline={() => setRingingCall(false)}
            />

            <GroupSettingsModal
                show={showGroupSettings}
                onClose={() => setShowGroupSettings(false)}
                conversation={conversation}
            />

            {/*  CSS */}
            <style>{`

                .chat-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 16px;
                    height: 60px;
                    background: var(--bg-header);
                    border-bottom: 1px solid var(--border);
                }

                .left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .user {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    overflow: hidden;
                    position: relative;
                    background: var(--bg-sidebar);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .status-dot {
                    position: absolute;
                    bottom: 2px;
                    right: 2px;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    border: 2px solid var(--bg-header);
                }

                .status-dot.online {
                    background: #25d366;
                }

                .status-dot.offline {
                    background: #8696a0;
                }

                .info {
                    display: flex;
                    flex-direction: column;
                }

                .name {
                    font-weight: 600;
                    font-size: 14px;
                    color: var(--text-primary);
                }

                .status {
                    font-size: 12px;
                    color: var(--text-secondary);
                }

                .icon-btn {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    color: var(--text-primary);
                }

                .icon-btn:hover {
                    background: var(--bg-sidebar);
                }

                .empty {
                    height: 60px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

            `}</style>
        </>
    );
};

export default connect(
    ({ chatReducer, theme, auth }) => ({
        ...chatReducer,
        currentUserName: auth?.user?.name,
        topNavCollapsed: theme.topNavCollapsed
    }),
    { StartConversation, toggleTopNav }
)(ChatHeader);