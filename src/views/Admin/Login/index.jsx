import React, { useState } from 'react';
import { Container, Button, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // ✅ FIXED BASE URL
  const apiBase =
    import.meta.env.VITE_API_BASE || "http://localhost:4000";

  const submit = async (e) => {
    e.preventDefault();

    if (!form.username.trim() || !form.password) {
      setError('Username and password required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        username: form.username.trim(),
        password: form.password
      };

      // ✅ FIXED ENDPOINT
      const res = await fetch(`${apiBase}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || 'Login failed');
      }

      if (json?.ok && json?.accessToken) {
        /* ================= CLEAR OLD ================= */
        localStorage.clear();

        /* ================= SAVE TOKEN ================= */
        localStorage.setItem('accessToken', json.accessToken);
        if (json.user?.role === 'admin') {
          localStorage.setItem('adminToken', json.accessToken);
        }

        /* ================= SAVE ROLE (AUTO DETECT) ================= */
        const isAdmin = json.user?.role === 'admin';
        localStorage.setItem('role', isAdmin ? 'admin' : 'user');

        /* ================= SAVE USER ================= */
        localStorage.setItem(
          'user',
          JSON.stringify({
            _id: json.user?._id,
            username: json.user?.username,
            name: json.user?.name,
            email: json.user?.email,
            profilePic:
              json.user?.profilePic ||
              json.user?.avatar ||
              '',
            role: isAdmin ? 'admin' : 'user'
          })
        );

        console.log('✅ Login success');

        /* ================= REDIRECT ================= */
        navigate(
          isAdmin ? '/admin/dashboard' : '/dashboard',
          { replace: true }
        );

        return;
      }

      throw new Error(json?.error || 'Login failed');

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h3 className="mb-3">Admin Login</h3>

      <form onSubmit={submit} className="d-flex flex-column gap-2 auth-card">

        {error && <Alert variant="danger">{error}</Alert>}

        <input
          className="form-control"
          placeholder="Username"
          value={form.username}
          onChange={e =>
            setForm({ ...form, username: e.target.value })
          }
        />

        <input
          type="password"
          className="form-control"
          placeholder="Password"
          value={form.password}
          onChange={e =>
            setForm({ ...form, password: e.target.value })
          }
        />

        <Button type="submit" disabled={loading}>
          {loading ? <Spinner size="sm" /> : 'Login'}
        </Button>

      </form>
    </Container>
  );
};

export default AdminLogin;
