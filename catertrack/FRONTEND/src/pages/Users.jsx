import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

const emptyForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'staff',
  canRecordPayments: false
};

export default function Users() {
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [statusTarget, setStatusTarget] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      setUsers(res.data.data);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const isSelf = (u) => u._id === me._id;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      email: u.email,
      password: '',
      role: u.role,
      canRecordPayments: Boolean(u.canRecordPayments)
    });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      if (editing) {
        await api.put(`/users/${editing._id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
          canRecordPayments: form.canRecordPayments
        });
        showToast('User updated');
      } else {
        await api.post('/users', form);
        showToast('User added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const togglePayments = async (u) => {
    setUpdatingId(u._id);
    try {
      await api.put(`/users/${u._id}`, { canRecordPayments: !u.canRecordPayments });
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleStatus = async () => {
    setChangingStatus(true);
    try {
      const res = await api.patch(`/users/${statusTarget._id}/toggle-status`);
      showToast(res.data.message || 'User updated');
      setStatusTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
      setStatusTarget(null);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Users</h1>
        <Button onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Add user
        </Button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Can record payments</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading users
                    </td>
                  </tr>
                )}

                {!loading &&
                  users.map((u) => (
                    <tr key={u._id}>
                      <td className="fw-semibold">
                        {u.name}
                        {isSelf(u) && <span className="badge text-bg-light border ms-2">You</span>}
                      </td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>
                        <span
                          className={`badge text-capitalize text-bg-${
                            u.role === 'admin' ? 'primary' : 'secondary'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <Form.Check
                          type="switch"
                          id={`pay-${u._id}`}
                          checked={u.role === 'admin' ? true : Boolean(u.canRecordPayments)}
                          disabled={u.role === 'admin' || updatingId === u._id}
                          onChange={() => togglePayments(u)}
                          aria-label={`Allow ${u.name} to record payments`}
                        />
                      </td>
                      <td>
                        <span
                          className={`badge text-bg-${u.isActive ? 'success' : 'secondary'}`}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-1"
                          onClick={() => openEdit(u)}
                          aria-label={`Edit ${u.name}`}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        <Button
                          size="sm"
                          variant={u.isActive ? 'outline-danger' : 'outline-success'}
                          disabled={isSelf(u)}
                          onClick={() => setStatusTarget(u)}
                          aria-label={u.isActive ? `Deactivate ${u.name}` : `Activate ${u.name}`}
                        >
                          <i className={`bi ${u.isActive ? 'bi-person-dash' : 'bi-person-check'}`}></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{editing ? 'Edit user' : 'Add user'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Full name</Form.Label>
              <Form.Control name="name" value={form.name} onChange={handleChange} required />
            </Form.Group>

            <Form.Group className="mb-3" controlId="username">
              <Form.Label>Username</Form.Label>
              <Form.Control
                name="username"
                value={form.username}
                onChange={handleChange}
                minLength={3}
                disabled={Boolean(editing)}
                required
              />
              {editing && (
                <Form.Text className="text-muted">The username cannot be changed.</Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            {!editing && (
              <Form.Group className="mb-3" controlId="password">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
                <Form.Text className="text-muted">At least 6 characters.</Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3" controlId="role">
              <Form.Label>Role</Form.Label>
              <Form.Select
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={Boolean(editing && isSelf(editing))}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </Form.Select>
              {editing && isSelf(editing) && (
                <Form.Text className="text-muted">You cannot change your own role.</Form.Text>
              )}
            </Form.Group>

            <Form.Check
              type="switch"
              id="canRecordPayments"
              name="canRecordPayments"
              label="Can record payments"
              checked={form.role === 'admin' ? true : form.canRecordPayments}
              disabled={form.role === 'admin'}
              onChange={handleChange}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-secondary"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner animation="border" size="sm" /> : 'Save'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={Boolean(statusTarget)}
        title={statusTarget?.isActive ? 'Deactivate user' : 'Activate user'}
        message={
          statusTarget?.isActive
            ? `Deactivate ${statusTarget?.name}? They will no longer be able to log in.`
            : `Activate ${statusTarget?.name}? They will be able to log in again.`
        }
        confirmText={statusTarget?.isActive ? 'Deactivate' : 'Activate'}
        variant={statusTarget?.isActive ? 'danger' : 'success'}
        loading={changingStatus}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}