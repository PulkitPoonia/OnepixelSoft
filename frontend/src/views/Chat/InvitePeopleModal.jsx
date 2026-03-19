import React, { useState, useEffect } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import SimpleBar from "simplebar-react";
import { API_BASE } from "../../config";

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('/uploads/')) return API_BASE + url;
  return url;
}

const InvitePeopleModal = ({ show, onClose, onInvite }) => {
  // Get conversations from localStorage
  let existingUsernames = [];
  try {
    const conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    const me = JSON.parse(localStorage.getItem('user') || '{}');
    existingUsernames = conversations
      .flatMap(c => (c.participants || []))
      .filter(p => p.username && p.username !== me.username)
      .map(p => p.username);
  } catch {}
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [search, setSearch] = useState("");

  const getToken = () => {
    return localStorage.getItem("accessToken") || localStorage.getItem("adminToken");
  };

  /* ===============================
     Fetch Users
  ================================ */
  useEffect(() => {
    if (show) {
      fetchUsers();
    }
  }, [show]);

  const fetchUsers = async () => {
    setLoading(true);

    try {
      const token = getToken();

      if (!token) {
        console.error("JWT token missing");
        setUsers([]);
        return;
      }

      const res = await fetch(`${API_BASE}/api/users?for=chat`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("Fetch users failed:", res.status);
        setUsers([]);
        return;
      }

      const data = await res.json();

      if (data?.ok && data.users) {
        let me = null;

        try {
          me = JSON.parse(localStorage.getItem("user"));
        } catch {
          me = null;
        }

        const filtered = data.users.filter(
          (u) => !me || u.username !== me.username
        );

        setUsers(filtered);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Fetch users failed:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ===============================
     Select User
  ================================ */
  const toggleUser = (user, checked) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, user]);
    } else {
      setSelectedUsers((prev) =>
        prev.filter((u) => u.username !== user.username)
      );
    }
  };

  /* ===============================
     Create Conversation (✅ FIXED)
  ================================ */
  const handleInvite = async () => {
    if (selectedUsers.length === 0) {
      alert("Select at least one user");
      return;
    }

    const me = JSON.parse(localStorage.getItem("user") || "{}");

    if (!me?.username) {
      alert("Login required. User object missing username.");
      console.error("User object:", me);
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        alert("No access token or admin token found in localStorage.");
        return;
      }
      // 1. Format participants array (Include yourself + invited users)
      const participants = [
        { username: me.username },
        ...selectedUsers.map(u => ({ username: u.username }))
      ];

      // 2. Make the missing API call to create the chat in the database
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ participants })
      });

      const data = await res.json();

      if (data.ok) {
        console.log("✅ Chat successfully created on backend!", data.conversationId);
        // Pass conversationId to parent for direct selection
        if (onInvite) {
          onInvite(data.conversationId);
        }
      } else {
        alert(
          `Failed to create chat.\n` +
          `Message: ${data.message || data.error || "Unknown error"}\n` +
          `Token used: ${token?.slice(0, 10)}...\n` +
          `Participants: ${JSON.stringify(participants)}\n` +
          `User: ${JSON.stringify(me)}`
        );
        console.error("Invite error details:", { data, token, participants, me });
      }

    } catch (error) {
      alert("Network or server error: " + error.message);
      console.error("Error creating conversation:", error);
    }

    setSelectedUsers([]);
    onClose();
  };

  /* ===============================
     Filter
  ================================ */
  const filteredUsers = users.filter((u) =>
    (u.name || u.username)
      .toLowerCase()
      .includes(search.toLowerCase()) &&
    !existingUsernames.includes(u.username)
  );

  return (
    <Modal show={show} onHide={onClose} centered dialogClassName="mw-400p">
      <Modal.Header className="header-wth-bg-inv">
        <Modal.Title>Invite People</Modal.Title>
        <Button
          bsPrefix="btn-close"
          className="text-white"
          onClick={onClose}
        >
          ×
        </Button>
      </Modal.Header>

      <Modal.Body className="p-0">
        <Form className="m-3">
          <Form.Control
            type="text"
            placeholder="Search People"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Form>

        <div className="h-350p">
          <SimpleBar style={{ height: "100%" }}>
            <ul className="invite-user-list">
              {loading && (
                <li className="text-center py-3">Loading...</li>
              )}

              {!loading && filteredUsers.length === 0 && (
                <li className="text-center py-3">
                  No users found
                </li>
              )}

              {filteredUsers.map((user) => (
                <li key={user.username}>
                  <div className="media d-flex align-items-center">
                    <div className="media-head me-3">
                      <div className="avatar avatar-sm avatar-rounded" style={{overflow:'hidden',position:'relative'}}>
                        {(user.profilePic || user.avatar) ? (
                          <img
                            src={getImageUrl(user.profilePic || user.avatar)}
                            className="avatar-img"
                            alt=""
                            style={{width:'100%',height:'100%',objectFit:'cover'}}
                          />
                        ) : (
                          <span className="initial-wrap">
                            {(user.name || user.username)[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="media-body">
                      <div className="user-name">
                        {user.name || user.username}
                      </div>
                    </div>
                  </div>

                  <Form.Check
                    type="checkbox"
                    checked={selectedUsers.some(
                      (u) => u.username === user.username
                    )}
                    onChange={(e) =>
                      toggleUser(user, e.target.checked)
                    }
                  />
                </li>
              ))}
            </ul>
          </SimpleBar>
        </div>
      </Modal.Body>

      <Modal.Footer className="justify-content-center">
        <Button
          variant="light"
          className="flex-fill"
          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          variant="primary"
          className="flex-fill"
          onClick={handleInvite}
        >
          Invite For Chat
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default InvitePeopleModal;