import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { useWindowWidth } from '@react-hook/window-size';
import { useNavigate, useLocation } from 'react-router-dom';
import { useRef } from 'react';
import ChatHeader from '../ChatHeader';
import ChatFooter from '../ChatFooter';
import ChatBody from '../Chats/ChatBody';
import GroupList from './GroupList';
import InvitePeopleModal from '../InvitePeopleModal';

// Redux
import store from '../../../redux/store';
import { connect } from 'react-redux';
import { StartConversation, loadMessages, loadConversations, setCurrentConversation } from '../../../redux/action/Chat';
import { SET_CURRENT_CONVERSATION, CLEAR_UNREAD } from '../../../redux/constants/Chat';
import socketService from '../../../utils/socketService';

const ChatGroups = ({ startChating, conversations, loadMessages, loadConversations, setCurrentConversation }) => {
    const [invitePeople, setInvitePeople] = useState(false);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const hasSelectedFromURL = useRef(false);

    const [isDark, setIsDark] = useState(
        document.documentElement.getAttribute("data-bs-theme") === "dark"
    );

    const windowWidth = useWindowWidth();

    // THEME LISTENER
    useEffect(() => {
        const observer = new MutationObserver(() => {
            const theme =
                document.documentElement.getAttribute("data-bs-theme") === "dark";
            setIsDark(theme);
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
        });

        return () => observer.disconnect();
    }, []);

    // Load conversations on mount
    useEffect(() => {
        loadConversations();

        // ✅ FIX: Clear current conversation on unmount
        return () => {
            console.log('🧹 Clearing current conversation on unmount (Groups)');
            setCurrentConversation(null);
        };
    }, [loadConversations, setCurrentConversation]);

    // Handle Deep Linking from URL
    useEffect(() => {
        if (hasSelectedFromURL.current) return;
        if (!conversations || conversations.length === 0) return;

        const urlParams = new URLSearchParams(location.search);
        const conversationId = urlParams.get("conversation");

        if (!conversationId) return;

        // Check if this group exists in the loaded conversations
        const exists = conversations.some(
            (c) => String(c?._id) === String(conversationId)
        );

        if (exists) {
            console.log('🔗 [URL] Auto-selecting group from URL:', conversationId);
            hasSelectedFromURL.current = true;
            handleGroupSelect(conversationId);
        }
    }, [location.search, conversations]);

    // Handle group selection
    const handleGroupSelect = (groupId) => {
        setSelectedGroupId(groupId);
        
        // Set current conversation in Redux
        store.dispatch({
            type: SET_CURRENT_CONVERSATION,
            conversationId: groupId
        });

        // ✅ IMMEDIATELY clear unread count when group is opened
        store.dispatch({
            type: CLEAR_UNREAD,
            conversationId: groupId
        });

        // Load messages for this group
        loadMessages(groupId);

        // Join socket room
        socketService.joinRoom(groupId);
    };

    return (
        <div className={`chat-app-root ${isDark ? "dark" : ""}`}>
            <div className="chat-app-container">

                <div className="chat-sidebar">
                    {/* Navigation Tabs */}
                    <div className="chat-nav-tabs">
                        <button 
                            className="chat-nav-tab position-relative"
                            onClick={() => navigate('/apps/chat/chats')}
                        >
                            Chats
                            {(() => {
                                const chatUnreadCount = conversations
                                    .filter(c => c.isGroup !== true && (!c.participants || c.participants.length <= 2))
                                    .reduce((sum, c) => sum + (c.messageCount || 0), 0);
                                return chatUnreadCount > 0 && <span className="tab-unread-dot" />;
                            })()}
                        </button>
                        <button 
                            className="chat-nav-tab active"
                            onClick={() => navigate('/apps/chat/chat-groups')}
                        >
                            Groups
                        </button>
                    </div>
                    <GroupList
                        conversations={conversations}
                        onGroupSelect={handleGroupSelect}
                        selectedGroupId={selectedGroupId}
                    />
                </div>

                <div
                    className="chat-main"
                    style={{ display: "flex", flexDirection: "column", height: "100%" }}
                >
                    {selectedGroupId ? (
                        <>
                            <div className="chat-header">
                                <ChatHeader invitePeople={() => setInvitePeople(!invitePeople)} />
                            </div>

                            <ChatBody conversationId={selectedGroupId} />

                            <div className="chat-footer">
                                <ChatFooter conversationId={selectedGroupId} />
                            </div>
                        </>
                    ) : (
                        <div className="chat-empty">
                            <h5>Select a group</h5>
                        </div>
                    )}
                </div>

                {/* Invite People */}
                <InvitePeopleModal show={invitePeople} onClose={() => setInvitePeople(!invitePeople)} />
            </div>

            {/* Chat Navigation Styles */}
            <style>{`
                .chat-nav-tabs {
                    display: flex;
                    gap: 8px;
                    padding: 12px 16px;
                    background: var(--bg-header);
                    border-bottom: 1px solid var(--border);
                }

                .chat-nav-tab {
                    padding: 8px 16px;
                    border: none;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                }

                .chat-nav-tab:hover {
                    background: var(--bg-tertiary);
                    color: var(--text-primary);
                }

                .chat-nav-tab.active {
                    background: var(--primary);
                    color: white;
                }

                .position-relative {
                    position: relative !important;
                }

                .tab-unread-dot {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 8px;
                    height: 8px;
                    background-color: #ff3b30;
                    border-radius: 50%;
                    border: 1px solid white;
                }
            `}</style>
        </div>
    );
};

const mapStateToProps = ({ chatReducer }) => ({
    startChating: chatReducer.startChating,
    conversations: chatReducer.conversations || []
});

export default connect(mapStateToProps, { StartConversation, loadMessages, loadConversations, setCurrentConversation })(ChatGroups);
