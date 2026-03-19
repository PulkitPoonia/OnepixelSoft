import React, { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

const GroupModel = ({ show, onClose, onGroupCreated }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [groupProfilePic, setGroupProfilePic] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const me = JSON.parse(localStorage.getItem("user") || "{}");

  // Load available users
  useEffect(() => {
    if (!show) return;

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
          // Exclude current user
          const filtered = (data.users || []).filter(u => u.username !== me.username);
          setUsers(filtered);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    };

    fetchUsers();
  }, [show, me.username]);

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

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) {
      alert("Please select at least one user");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
      
      // Create conversation with selected users (system will treat as group)
      const participants = [
        { username: me.username },
        ...selectedUsers.map(username => {
          const user = users.find(u => u.username === username);
          return { username, name: user?.name };
        })
      ];

      const groupNameToSend = groupName || `Group: ${selectedUsers.slice(0, 2).join(", ")}...`;

      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          participants,
          groupName: groupNameToSend,
          groupProfilePic: groupProfilePic || null
        }),
      });

      const data = await res.json();
      
      if (data.ok) {
        setGroupName("");
        setSelectedUsers([]);
        setGroupProfilePic(null);
        setProfilePreview(null);
        onGroupCreated();
      } else {
        alert(data.error || "Failed to create group");
      }
    } catch (err) {
      console.error("❌ CreateGroupModal: Error creating group:", err);
      alert("Failed to create group: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create Group</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* GROUP NAME */}
        <div className="mb-3">
          <Form.Label>Group Name (Optional)</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter group name..."
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
        </div>

        {/* GROUP PROFILE PICTURE */}
        <div className="mb-3">
          <Form.Label>Group Profile Picture (Optional)</Form.Label>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            {/* Profile Preview */}
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
                <img src={profilePreview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '30px' }}>👥</span>
              )}
            </div>

            {/* Upload Button */}
            <div style={{ flex: 1 }}>
              <Form.Group>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePicChange}
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
          <Form.Label>Select Users ({selectedUsers.length} selected)</Form.Label>
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
                  style={{ marginRight: "10px", cursor: "pointer" }}
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
          onClick={handleCreateGroup}
          disabled={loading || selectedUsers.length === 0}
        >
          {loading ? "Creating..." : "Create Group"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GroupModel;
