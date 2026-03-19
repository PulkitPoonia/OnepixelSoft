import React, { useEffect, useState, useRef, useMemo } from "react";
import ContactList from "./ContactList";
import ChatBody from "./ChatBody";
import ChatFooter from "../ChatFooter";
import ChatHeader from "../ChatHeader";
import InvitePeopleModal from "../InvitePeopleModal";

import { useWindowWidth } from "@react-hook/window-size";
import { useLocation, useNavigate } from "react-router-dom";
import socketService from "../../../utils/socketService";
import store from "../../../redux/store";
import { debounce } from "../../../utils/debounce";

import { connect } from "react-redux";
import {
  StartConversation,
  createConversation,
  setCurrentConversation,
  setUser,
  sentMsg,
  loadConversations,
  loadMessages,
} from "../../../redux/action/Chat";

import { SET_CURRENT_CONVERSATION, CLEAR_UNREAD } from "../../../redux/constants/Chat";

import "../../../styles/css/theme.css";

const mapStateToProps = ({ chatReducer }) => ({
  startChating: chatReducer.startChating,
  conversations: chatReducer.conversations,
});

const Chats = (props) => {
  const {
    startChating,
    loadConversations,
    loadMessages,
    conversations,
    StartConversation,
    createConversation,
    setCurrentConversation,
  } = props;

  const [invitePeople, setInvitePeople] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState(null);

  const width = useWindowWidth();
  const location = useLocation();
  const navigate = useNavigate();
  const me = JSON.parse(localStorage.getItem('user') || '{}');

  const hasSelectedFromURL = useRef(false);
  const prevConversationRef = useRef(null);

 
  const getToken = () => localStorage.getItem("accessToken") || localStorage.getItem("adminToken");

  // Filter and deduplicate conversations - only show 1-on-1 chats
  const safeConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    
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
    
    // Deduplicate: Keep only the most recent conversation per user
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
          // Replace in array
          const idx = deduplicated.indexOf(existing);
          if (idx !== -1) {
            deduplicated[idx] = conv;
          }
        }
      }
    });
    
    return deduplicated;
  }, [conversations, me.username]);

 
  const debouncedLoadConversations = useMemo(
    () => debounce(() => loadConversations(), 500),
    [loadConversations]
  );

  /* ================= THEME FIX ================= */
  const [isDark, setIsDark] = useState(
    document.documentElement.getAttribute("data-bs-theme") === "dark"
  );

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

  /* ================= LOAD ================= */
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    socketService.connect();
    
  
    loadConversations();
    
    // ✅ FIX: Clear current conversation on unmount
    return () => {
      console.log('🧹 Clearing current conversation on unmount');
      setCurrentConversation(null);
      socketService.disconnect();
    };
  }, [loadConversations, setCurrentConversation]);

  /* ================= SOCKET ================= */
  useEffect(() => {
    const handleNewConversation = () => {
      debouncedLoadConversations();
    };

    socketService.on("new_conversation", handleNewConversation);

    return () => {
      socketService.off("new_conversation", handleNewConversation);
    };
  }, [debouncedLoadConversations]);

  /* ================= URL SELECT ================= */
  useEffect(() => {
    if (hasSelectedFromURL.current) return;
    if (!safeConversations.length) return;

    const urlParams = new URLSearchParams(location.search);
    const conversationId = urlParams.get("conversation");

    if (!conversationId) return;

    const exists = safeConversations.some(
      (c) => String(c?._id) === String(conversationId)
    );

    if (exists) {
      hasSelectedFromURL.current = true;
      handleConversationSelect(conversationId);
    }
  }, [location.search, safeConversations]);

  /* ================= SELECT ================= */
  const handleConversationSelect = async (conversationId) => {
    if (!conversationId) return;
    if (String(conversationId) === String(selectedConversationId)) return;

    const conversation = safeConversations.find(
      (c) => String(c?._id) === String(conversationId)
    );

    if (!conversation) return;

    StartConversation(true);

    if (prevConversationRef.current) {
      socketService.leaveRoom(prevConversationRef.current);
    }

    socketService.joinRoom(conversationId);

    prevConversationRef.current = conversationId;
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
  };

  /* ================= INVITE ================= */
  const handleInvite = async (conversationId) => {
    if (!conversationId) return;
    await loadConversations();
    setTimeout(() => handleConversationSelect(conversationId), 300);
  };

  // Calculate total unread count for groups
  const groupUnreadCount = useMemo(() => {
    if (!Array.isArray(conversations)) return 0;
    return conversations
      .filter(c => c.isGroup === true || (c.participants && c.participants.length > 2))
      .reduce((sum, c) => sum + (c.messageCount || 0), 0);
  }, [conversations]);

  if (location.pathname.includes("/auth")) return null;

  return (
    <div className={`chat-app-root ${isDark ? "dark" : ""}`}>
      <div className="chat-app-container">

        <div className="chat-sidebar">
          {/* Navigation Tabs */}
          <div className="chat-nav-tabs">
            <button 
              className="chat-nav-tab active"
              onClick={() => navigate('/apps/chat/chats')}
            >
              Chats
            </button>
            <button 
              className="chat-nav-tab position-relative"
              onClick={() => navigate('/apps/chat/chat-groups')}
            >
              Groups
              {groupUnreadCount > 0 && (
                <span className="tab-unread-dot" />
              )}
            </button>
          </div>

          <ContactList
            invitePeople={() => setInvitePeople(!invitePeople)}
            conversations={safeConversations}
            onConversationSelect={handleConversationSelect}
            selectedConversationId={selectedConversationId}
          />
        </div>

      <div
  className="chat-main"
  style={{ display: "flex", flexDirection: "column", height: "100%" }}
>
          {selectedConversationId ? (
            <>
              <div className="chat-header">
                <ChatHeader
                  invitePeople={() => setInvitePeople(!invitePeople)}
                />
              </div>

             <ChatBody conversationId={selectedConversationId} />

             <div className="chat-footer">
  <ChatFooter conversationId={selectedConversationId} />
</div>
            </>
          ) : (
            <div className="chat-empty">
              <h5>Select a conversation</h5>
            </div>
          )}
        </div>

        <InvitePeopleModal
          show={invitePeople}
          onClose={() => setInvitePeople(false)}
          onInvite={handleInvite}
        />
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

export default connect(mapStateToProps, {
  StartConversation,
  loadConversations,
  loadMessages,
  createConversation,
  setCurrentConversation,
})(Chats);