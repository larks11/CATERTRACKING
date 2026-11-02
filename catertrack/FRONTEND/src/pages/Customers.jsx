import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;
const emptyForm = { fullName: '', contactNumber: '', email: '', address: '', notes: '' };

export default function Customers() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: { page, limit: PAGE_SIZE, search }
      });
      setCustomers(res.data.data);
      setPages(res.data.pages);
      setTotal(res.data.total);
      if (page > res.data.pages) setPage(res.data.pages);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, search, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      fullName: customer.fullName || '',
      contactNumber: customer.contactNumber || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/customers/${editing._id}`, form);
        showToast('Customer updated');
      } else {
        await api.post('/customers', form);
        showToast('Customer added');
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
      const res = await api.delete(`/customers/${deleteTarget._id}`);
      showToast(res.data.message || 'Customer deleted');
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
        <h1 className="h3 mb-0">Customers</h1>
        <Button onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Add customer
        </Button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="input-group mb-3" style={{ maxWidth: 420 }}>
            <span className="input-group-text">
              <i className="bi bi-search"></i>
            </span>
            <input
              type="search"
              className="form-control"
              placeholder="Search name, contact, email, or address"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-3">
              <thead className="table-light">
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading customers
                    </td>
                  </tr>
                )}

                {!loading && customers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      {search ? 'No customers match your search.' : 'No customers yet.'}
                    </td>
                  </tr>
                )}

                {!loading &&
                  customers.map((c) => (
                    <tr key={c._id}>
                      <td className="fw-semibold">{c.fullName}</td>
                      <td>{c.contactNumber}</td>
                      <td>{c.email || '-'}</td>
                      <td>{c.address}</td>
                      <td className="text-end text-nowrap">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-1"
                          onClick={() => openEdit(c)}
                          aria-label={`Edit ${c.fullName}`}
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setDeleteTarget(c)}
                            aria-label={`Delete ${c.fullName}`}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} pages={pages} total={total} onChange={setPage} />
        </div>
      </div>

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">
              {editing ? 'Edit customer' : 'Add customer'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            <Form.Group className="mb-3" controlId="fullName">
              <Form.Label>Full name</Form.Label>
              <Form.Control
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="contactNumber">
              <Form.Label>Contact number</Form.Label>
              <Form.Control
                name="contactNumber"
                value={form.contactNumber}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="email">
              <Form.Label>Email (optional)</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="address">
              <Form.Label>Address</Form.Label>
              <Form.Control
                name="address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="notes">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </Form.Group>
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
        title="Delete customer"
        message={`Delete ${deleteTarget?.fullName}? This cannot be undone.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}