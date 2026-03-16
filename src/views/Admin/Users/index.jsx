import React, { useEffect, useState } from 'react';
import { Button, Container, Table, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '../../../utils/permissions';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noPermission, setNoPermission] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    phone: '',
    resume: '',
    profilePic: '',
    position: ''
  });

  const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
  const navigate = useNavigate();

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
    const role = localStorage.getItem('role');

    if (!token || role !== 'admin') {
      navigate('/admin/login', { replace: true });
      return;
    }

    // ✅ FIX: Check if user has permission to view users
    if (!hasPermission('users')) {
      setNoPermission(true);
      return;
    }

    fetchUsers();
  }, [navigate]);

  /* ================= FETCH USERS ================= */
  const fetchUsers = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');

      const res = await fetch(`${apiBase}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      const json = await res.json();

      if (json?.ok) {
        // Accept both .docs and .users for compatibility
        setUsers(json.docs || json.users || []);
      } else {
        setUsers([]);
      }

    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPLOAD ================= */
  const uploadFile = async (file, type) => {
    if (!file) return null;

    try {
      const reader = new FileReader();

      return new Promise((resolve) => {
        reader.onload = async (e) => {
          const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');

          const endpoint =
            type === 'resume'
              ? '/api/upload/resume'
              : '/api/upload/profile-picture';

          // Support uploading for multiple usernames
          let usernames = [];
          if (editingUser) {
            // If editingUser is an array, upload for all
            if (Array.isArray(editingUser)) {
              usernames = editingUser.map(u => u.username);
            } else {
              usernames = [editingUser.username];
            }
          } else if (form && form.username) {
            usernames = [form.username];
          }

          const res = await fetch(`${apiBase}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              filename: file.name,
              data: e.target.result,
              username: usernames.length > 1 ? usernames : usernames[0],
            }),
          });

          const json = await res.json();
          resolve(json.ok ? json.url : null);
        };

        reader.readAsDataURL(file);
      });

    } catch {
      return null;
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const url = await uploadFile(file, type);

    if (url) {
      setForm(prev => ({ ...prev, [type]: url }));
    }
  };

  /* ================= SAVE USER ================= */
  const saveUser = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');
    const isEditing = !!editingUser;

    // Prevent overwriting password with empty string unless changed
    let payload = { ...form };
    if (isEditing) {
      payload.id = editingUser._id;
      if (!form.password) {
        delete payload.password;
      }
    }

    try {
      const res = await fetch(`${apiBase}/api/users`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.ok) {
        alert('Saved successfully!');
        setShowCreate(false);
        resetForm();
        fetchUsers();
      } else {
        alert(`Error: ${json.error || 'Failed to save user'}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const editUser = (u) => {
    setEditingUser(u);
    setShowCreate(true);

    setForm({
      username: u.username || '',
      email: u.email || '',
      name: u.name || '',
      password: '',
      phone: u.phone || '',
      resume: u.resume || '',
      profilePic: u.profilePic || '',
      position: u.position || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  /* ================= RESET FORM ================= */
  const resetForm = () => {
    setForm({
      username: '',
      email: '',
      name: '',
      password: '',
      phone: '',
      resume: '',
      profilePic: '',
      position: ''
    });
    setEditingUser(null);
  };

  /* ================= UI ================= */

  return (
    <Container className="py-4">
      {/* ✅ FIX: Show no permission message */}
      {noPermission && (
        <Alert variant="danger" className="mb-4">
          <h5>🔒 Access Denied</h5>
          <p>You don't have permission to view or manage users. Contact your administrator for access.</p>
        </Alert>
      )}

      {!noPermission && (
        <>
          <div className="d-flex justify-content-between mb-3">
            <h3>Admin — Users</h3>
            <Button onClick={() => {
              if (!showCreate) {
                // Opening form - reset it for new user
                resetForm();
              }
              setShowCreate(s => !s);
            }}>
              {showCreate ? 'Cancel' : 'Create User'}
            </Button>
          </div>

          {showCreate && (
            <div className="mb-4 p-3 border rounded bg-light">
              <h5>{editingUser ? 'Edit User' : 'Create New User'}</h5>
              <form onSubmit={saveUser}>
                <div className="mb-3">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-control"
                    name="username"
                    value={form.username}
                    onChange={handleInputChange}
                    disabled={!!editingUser}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={form.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={form.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    name="password"
                    value={form.password}
                    onChange={handleInputChange}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current password' : ''}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    name="phone"
                    value={form.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Position</label>
                  <input
                    type="text"
                    className="form-control"
                    name="position"
                    value={form.position}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Resume</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => handleFileChange(e, 'resume')}
                  />
                  {form.resume && <small className="d-block mt-2">Resume: <a href={form.resume} target="_blank">View</a></small>}
                </div>

                <div className="mb-3">
                  <label className="form-label">Profile Picture</label>
                  <input
                    type="file"
                    className="form-control"
                    onChange={(e) => handleFileChange(e, 'profilePic')}
                  />
                  {form.profilePic && <small className="d-block mt-2">
                    <img src={form.profilePic} alt="profile" style={{ width: 60, height: 60, borderRadius: '50%' }} />
                  </small>}
                </div>

                <Button variant="success" type="submit">Save</Button>
                <Button variant="secondary" className="ms-2" onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}>Cancel</Button>
              </form>
            </div>
          )}

          {loading ? <Spinner /> : (
            <Table bordered hover responsive>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Resume</th>
                  <th>Profile</th>
                  <th>Edit</th>
                </tr>
              </thead>

              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.name}</td>

                    <td>
                      {u.resume ? (
                        <a href={encodeURI(u.resume)} target="_blank">View</a>
                      ) : '-'}
                    </td>

                    <td>
                      {u.profilePic ? (
                        <img
                          src={u.profilePic}
                          alt="profile"
                          style={{ width: 40, height: 40, borderRadius: '50%' }}
                        />
                      ) : '-'}
                    </td>

                    <td>
                      <Button variant="warning" onClick={() => editUser(u)}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </Container>
  );
};

export default AdminUsers;
