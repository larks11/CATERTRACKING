import { useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const emptyForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      showToast('Password updated');
      setForm(emptyForm);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="h3 mb-3">My profile</h1>

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 mb-3">Account</h2>
              <dl className="row mb-0">
                <dt className="col-4 text-muted fw-normal">Name</dt>
                <dd className="col-8">{user?.name}</dd>
                <dt className="col-4 text-muted fw-normal">Username</dt>
                <dd className="col-8">{user?.username}</dd>
                <dt className="col-4 text-muted fw-normal">Email</dt>
                <dd className="col-8">{user?.email}</dd>
                <dt className="col-4 text-muted fw-normal">Role</dt>
                <dd className="col-8 text-capitalize">{user?.role}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h6 mb-3">Change password</h2>

              {error && <div className="alert alert-danger py-2">{error}</div>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="currentPassword">
                  <Form.Label>Current password</Form.Label>
                  <Form.Control
                    type="password"
                    name="currentPassword"
                    value={form.currentPassword}
                    onChange={handleChange}
                    autoComplete="current-password"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="newPassword">
                  <Form.Label>New password</Form.Label>
                  <Form.Control
                    type="password"
                    name="newPassword"
                    value={form.newPassword}
                    onChange={handleChange}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirmPassword">
                  <Form.Label>Confirm new password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                </Form.Group>

                <Button type="submit" disabled={saving}>
                  {saving ? <Spinner animation="border" size="sm" /> : 'Update password'}
                </Button>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}