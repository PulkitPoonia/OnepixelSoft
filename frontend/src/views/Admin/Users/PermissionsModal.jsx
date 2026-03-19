import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

const PermissionsModal = ({ show, user, onClose, apiBase, onPermissionsUpdated }) => {
  const [permissions, setPermissions] = useState({
    canCreateGroups: false,
    canManageGroupAccess: false,
    canAccessTasklist: false
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && user.permissions) {
      setPermissions(user.permissions);
    }
  }, [user, show]);

  const permissionLabels = {
    canCreateGroups: 'Create Groups',
    canManageGroupAccess: 'Manage Group Access',
    canAccessTasklist: 'Access Task List'
  };

  const handlePermissionChange = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('accessToken');

      const res = await fetch(`${apiBase}/api/user-permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user._id,
          permissions: permissions
        }),
      });

      const json = await res.json();

      if (json.ok) {
        setError('');
        alert(`✅ Permissions updated successfully!\n\nThe user will see the changes after they:\n- Refresh the page, or\n- Log in again`);
        onPermissionsUpdated();
        onClose();
      } else {
        setError(json.error || 'Failed to save permissions');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage Permissions: {user?.username}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div>
          <h6 className="mb-3">Select permissions for this user:</h6>
          <Form>
            {Object.entries(permissionLabels).map(([key, label]) => (
              <Form.Check
                key={key}
                type="checkbox"
                id={`perm-${key}`}
                label={label}
                checked={permissions[key] || false}
                onChange={() => handlePermissionChange(key)}
                className="mb-2"
              />
            ))}
          </Form>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? <Spinner size="sm" /> : 'Save Permissions'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PermissionsModal;
