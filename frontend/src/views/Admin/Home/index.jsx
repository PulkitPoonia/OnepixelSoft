import React, { useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { hasPermission, notifyNoPermission } from '../../../utils/permissions';

const AdminHome = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('adminToken');

  useEffect(() => {
    if (!token) navigate('/admin/login', { replace: true });
  }, [navigate, token]);

  if (!token) return null;

  return (
    <Container className="py-4">
      <h3 className="mb-3">Admin Console</h3>
      <p>Welcome to the admin console. Use the links below to manage the application.</p>
      <div className="d-flex gap-2">
        <Button as={Link} to="/dashboard" variant="primary">Dashboard</Button>
        <Button variant="secondary" onClick={(e) => {
          e.preventDefault();
          if (!hasPermission('users')) return notifyNoPermission();
          navigate('/admin/users');
        }}>Users</Button>
      </div>
    </Container>
  );
};

export default AdminHome;
