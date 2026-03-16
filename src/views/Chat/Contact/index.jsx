import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import ChatHeader from '../ChatHeader';
import InvitePeopleModal from '../InvitePeopleModal';
import ChatBody from '../Chats/ChatBody';
import ContactList from './ContactList';
import ChatFooter from '../ChatFooter';
import { useNavigate } from 'react-router-dom';

// Redux
import { connect } from 'react-redux';
import store from '../../../redux/store';
import { useWindowWidth } from '@react-hook/window-size';
import { loadMessages, loadConversations } from '../../../redux/action/Chat';
import { SET_CURRENT_CONVERSATION, CLEAR_UNREAD } from '../../../redux/constants/Chat';

const ChatContacts = ({ startChating, conversations, loadMessages, loadConversations }) => {
    const [invitePeople, setInvitePeople] = useState(false);
    const [selectedConversationId, setSelectedConversationId] = useState(null);

    const navigate = useNavigate();

    const windowWidth = useWindowWidth();

    // Load conversations on mount
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);

    // Handle conversation click
    const handleConversationSelect = (conversationId) => {
        setSelectedConversationId(conversationId);

        // ✅ FIX: Set currentConversationId in Redux so confirmSeen works
        console.log('🔄 Setting current conversation:', conversationId);
        store.dispatch({
            type: SET_CURRENT_CONVERSATION,
            conversationId
        });

        // ✅ IMMEDIATELY clear unread count when conversation is opened
        store.dispatch({
            type: CLEAR_UNREAD,
            conversationId
        });

        loadMessages(conversationId);

        // ✅ FIXED NAVIGATION
        navigate(`/apps/chat/chats?conversation=${conversationId}`);
    };

    return (
        <div className="hk-pg-body py-0">
            <div className={classNames("chatapp-wrap", { "chatapp-slide": startChating })}>
                <div className="chatapp-content">
                    {/* Navigation Tabs */}
                    <div className="chat-nav-tabs">
                        <button 
                            className="chat-nav-tab"
                            onClick={() => navigate('/apps/chat/chats')}
                        >
                            Chats
                        </button>
                        <button 
                            className="chat-nav-tab"
                            onClick={() => navigate('/apps/chat/chat-groups')}
                        >
                            Groups
                        </button>
                    </div>

                    <ContactList 
                        conversations={conversations}
                        selectedConversationId={selectedConversationId}
                        onConversationSelect={handleConversationSelect} 
                    />

                    <div className="chatapp-single-chat">
                        <ChatHeader invitePeople={() => setInvitePeople(!invitePeople)} />
                        <ChatBody conversationId={selectedConversationId} />
                        <ChatFooter conversationId={selectedConversationId} />
                    </div>

                    {/* Invite People */}
                    <InvitePeopleModal
                        show={invitePeople}
                        onClose={() => setInvitePeople(!invitePeople)}
                    />

                </div>
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
            `}</style>
        </div>
    );
};

const mapStateToProps = ({ chatReducer }) => {
    const { startChating, conversations } = chatReducer;
    return { startChating, conversations };
};

export default connect(
    mapStateToProps,
    { loadMessages, loadConversations }
)(ChatContacts);
