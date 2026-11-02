import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatCurrency } from '../utils/format';

const emptyForm = {
  name: '',
  description: '',
  pricingType: 'per_head',
  price: '',
  inclusions: '',
  isActive: true
};

export default function Packages() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (pkg) => {
    setEditing(pkg);
    setForm({
      name: pkg.name || '',
      description: pkg.description || '',
      pricingType: pkg.pricingType || 'per_head',
      price: pkg.price ?? '',
      inclusions: (pkg.inclusions || []).join('\n'),
      isActive: pkg.isActive !== false
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

    const payload = {
      name: form.name,
      description: form.description,
      pricingType: form.pricingType,
      price: Number(form.price),
      inclusions: form.inclusions
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      isActive: form.isActive
    };

    try {
      if (editing) {
        await api.put(`/packages/${editing._id}`, payload);
        showToast('Package updated');
      } else {
        await api.post('/packages', payload);
        showToast('Package added');
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/packages/${deleteTarget._id}`);
      showToast(res.data.message || 'Package deleted', res.data.data ? 'warning' : 'success');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Catering Packages</h1>
        {isAdmin && (
          <Button onClick={openAdd}>
            <i className="bi bi-plus-lg me-1"></i>
            Add package
          </Button>
        )}
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {!loading && packages.length === 0 && (
        <div className="alert alert-light border">No packages yet.</div>
      )}

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
        {!loading &&
          packages.map((pkg) => (
            <div className="col" key={pkg._id}>
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h2 className="h5 mb-0">{pkg.name}</h2>
                    <span className={`badge ${pkg.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                      {pkg.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="fs-4 fw-semibold text-primary mb-1">
                    {formatCurrency(pkg.price)}
                    <small className="fs-6 text-muted fw-normal">
                      {pkg.pricingType === 'per_head' ? ' / head' : ' fixed'}
                    </small>
                  </div>

                  {pkg.description && <p className="text-muted small">{pkg.description}</p>}

                  {pkg.inclusions?.length > 0 && (
                    <ul className="small ps-3 mb-3">
                      {pkg.inclusions.map((item, index) => (
                        <li key={`${pkg._id}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {isAdmin && (
                    <div className="mt-auto pt-2">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => openEdit(pkg)}
                      >
                        <i className="bi bi-pencil me-1"></i>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => setDeleteTarget(pkg)}
                      >
                        <i className="bi bi-trash me-1"></i>
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">
              {editing ? 'Edit package' : 'Add package'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            <Form.Group className="mb-3" controlId="name">
              <Form.Label>Package name</Form.Label>
              <Form.Control name="name" value={form.name} onChange={handleChange} required />
            </Form.Group>

            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="description"
                value={form.description}
                onChange={handleChange}
              />
            </Form.Group>

            <div className="row">
              <Form.Group className="mb-3 col-6" controlId="pricingType">
                <Form.Label>Pricing type</Form.Label>
                <Form.Select name="pricingType" value={form.pricingType} onChange={handleChange}>
                  <option value="per_head">Per head</option>
                  <option value="fixed">Fixed</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-6" controlId="price">
                <Form.Label>Price (PHP)</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            <Form.Group className="mb-3" controlId="inclusions">
              <Form.Label>Inclusions (one per line)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="inclusions"
                value={form.inclusions}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Check
              type="switch"
              id="isActive"
              name="isActive"
              label="Active (available for new reservations)"
              checked={form.isActive}
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
        show={Boolean(deleteTarget)}
        title="Delete package"
        message={`Delete ${deleteTarget?.name}? If it was used in reservations, it will be deactivated instead.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}