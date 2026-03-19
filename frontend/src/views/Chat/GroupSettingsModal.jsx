import React, { useEffect, useState } from "react";
import { Button, Form, Modal, Alert } from "react-bootstrap";
import { connect } from "react-redux";
import { updateConversation } from "../../redux/action/Chat";
import { userHasPermission } from "../../utils/permissions";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const GroupSettingsModal = ({ show, onClose, conversation, updateConversation }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupProfilePic, setGroupProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(JSON.parse(localStorage.getItem("user") || "{}"));

  // Refresh user data on mount to get latest permissions
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
        if (!token) return;

        const res = await fetch(`${API_BASE}/api/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setMe(data.user);
            localStorage.setItem("user", JSON.stringify(data.user));
          }
        }
      } catch (err) {
        console.error("Failed to refresh user data:", err);
      }
    };

    if (show) {
      refreshUserData();
    }
  }, [show]);

  useEffect(() => {
    if (!show || !conversation) return;

    // Reset and populate with current group data
    setGroupName(conversation.groupName || "");
    setProfilePreview(conversation.groupProfilePic || null);
    setGroupProfilePic(null); // Reset file upload
    
    const participants = (conversation.participants || [])
      .map(p => p.username)
      .filter(username => username !== me.username);
    setSelectedUsers(participants);

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
        const res = await fetch(`${API_BASE}/api/users?for=chat`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.ok) {
          const filtered = (data.users || []).filter(u => u.username !== me.username);
          setUsers(filtered);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };

    fetchUsers();
  }, [show, conversation, me.username]);

  const handleUserToggle = (username) => {
    setSelectedUsers(prev =>
      prev.includes(username)
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setGroupProfilePic(base64);
      setProfilePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateGroup = async () => {
    setLoading(true);
    try {
      const participants = [
        { username: me.username },
        ...selectedUsers.map(username => {
          const user = users.find(u => u.username === username);
          return { username, name: user?.name };
        })
      ];

      const updateData = {
        groupName,
        participants
      };

      if (groupProfilePic) {
        updateData.groupProfilePic = groupProfilePic;
      }

      const result = await updateConversation(conversation._id, updateData);
      
      if (result.ok) {
        onClose();
      } else {
        alert("Failed to update group: " + (result.message || result.error || "Unknown error"));
      }
    } catch (err) {
      console.error("❌ GroupSettingsModal: Error updating group:", err);
      alert("Failed to update group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Group Settings</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!userHasPermission(me, 'canManageGroupAccess') && (
          <Alert variant="warning" className="mb-3">
            <strong>⚠️ Permission Denied</strong><br/>
            You don't have permission to manage group members.
          </Alert>
        )}

        {/* GROUP NAME */}
        <div className="mb-3">
          <Form.Label>Group Name</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            disabled={!userHasPermission(me, 'canManageGroupAccess')}
          />
        </div>

        {/* GROUP PROFILE PICTURE */}
        <div className="mb-3">
          <Form.Label>Group Profile Picture</Form.Label>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              border: '2px solid var(--border)'
            }}>
              {profilePreview ? (
                <img src={profilePreview.startsWith('/uploads') ? `${API_BASE}${profilePreview}` : profilePreview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '30px' }}>👥</span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <Form.Group>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
                  disabled={!userHasPermission(me, 'canManageGroupAccess')}
                  style={{
                    fontSize: '13px'
                  }}
                />
              </Form.Group>
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '6px' }}>
                Recommended: 200x200px or larger
              </small>
            </div>
          </div>
        </div>

        {/* SELECT USERS */}
        <div className="mb-3">
          <Form.Label>Manage Members ({selectedUsers.length + 1} total)</Form.Label>
          <div style={{
            maxHeight: "300px",
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "10px"
          }}>
            {users.map(user => (
              <div 
                key={user.username}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px",
                  borderBottom: "1px solid var(--border)"
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.username)}
                  onChange={() => handleUserToggle(user.username)}
                  disabled={!userHasPermission(me, 'canManageGroupAccess')}
                  style={{ marginRight: "10px", cursor: userHasPermission(me, 'canManageGroupAccess') ? "pointer" : "not-allowed" }}
                />
                <div>
                  <div style={{ fontWeight: "500" }}>{user.name || user.username}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    @{user.username}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleUpdateGroup}
          disabled={loading || !userHasPermission(me, 'canManageGroupAccess')}
        >
          {loading ? "Updating..." : "Save Changes"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default connect(null, { updateConversation })(GroupSettingsModal);
