import { useCallback, useEffect, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import ReservationDetailModal from '../components/ReservationDetailModal';
import {
  eventTypeLabel,
  formatCurrency,
  formatEventDate,
  formatTime,
  toDateInput
} from '../utils/format';
import {
  EVENT_TYPES,
  RESERVATION_STATUSES,
  paymentVariant,
  statusVariant
} from '../utils/status';

const PAGE_SIZE = 10;

const emptyForm = {
  customer: '',
  eventType: 'birthday',
  eventDate: '',
  startTime: '',
  venue: '',
  guestCount: '',
  package: '',
  status: 'Pending',
  notes: ''
};

export default function Reservations() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [reservations, setReservations] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [conflicts, setConflicts] = useState([]);

  const [detail, setDetail] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/customers', { params: { limit: 500 } }),
      api.get('/packages')
    ])
      .then(([customerRes, packageRes]) => {
        const sorted = [...customerRes.data.data].sort((a, b) =>
          a.fullName.localeCompare(b.fullName)
        );
        setCustomers(sorted);
        setPackages(packageRes.data.data);
      })
      .catch((err) => showToast(getErrorMessage(err), 'danger'));
  }, [showToast]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/reservations', { params });
      setReservations(res.data.data);
      setPages(res.data.pages);
      setTotal(res.data.total);
      if (page > res.data.pages) setPage(res.data.pages);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoading(false);
    }
  }, [page, status, startDate, endDate, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!showForm || !form.eventDate || !form.startTime) {
      setConflicts([]);
      return undefined;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/reservations/check-conflict', {
          params: {
            eventDate: form.eventDate,
            startTime: form.startTime,
            excludeId: editing?._id
          }
        });
        if (active) setConflicts(res.data.conflicts || []);
      } catch (err) {
        if (active) setConflicts([]);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showForm, form.eventDate, form.startTime, editing]);

  const selectedPackage = packages.find((p) => p._id === form.package);
  const guests = Number(form.guestCount);
  let estimatedTotal = null;
  if (selectedPackage && guests > 0) {
    estimatedTotal =
      selectedPackage.pricingType === 'per_head'
        ? selectedPackage.price * guests
        : selectedPackage.price;
  }

  const packageOptions = packages.filter((p) => p.isActive || p._id === form.package);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setConflicts([]);
    setShowForm(true);
  };

  const openEdit = (reservation) => {
    setEditing(reservation);
    setForm({
      customer: reservation.customer?._id || '',
      eventType: reservation.eventType,
      eventDate: toDateInput(reservation.eventDate),
      startTime: reservation.startTime,
      venue: reservation.venue,
      guestCount: reservation.guestCount,
      package: reservation.package?._id || '',
      status: reservation.status,
      notes: reservation.notes || ''
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

    const payload = { ...form, guestCount: Number(form.guestCount) };

    try {
      if (editing) {
        await api.put(`/reservations/${editing._id}`, payload);
        showToast('Reservation updated');
      } else {
        const res = await api.post('/reservations', payload);
        showToast('Reservation added');
        if (res.data.doubleBookingWarning) {
          showToast(res.data.doubleBookingWarning, 'warning');
        }
      }
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (reservation, nextStatus) => {
    setUpdatingId(reservation._id);
    try {
      await api.patch(`/reservations/${reservation._id}/status`, { status: nextStatus });
      showToast(`Status changed to ${nextStatus}`);
      await load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/reservations/${deleteTarget._id}`);
      showToast(res.data.message || 'Reservation deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Reservations</h1>
        <Button onClick={openAdd}>
          <i className="bi bi-plus-lg me-1"></i>
          Add reservation
        </Button>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-end mb-3">
            <div className="col-12 col-md-3">
              <Form.Label className="small text-muted mb-1">Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {RESERVATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </div>
            <div className="col-6 col-md-3">
              <Form.Label className="small text-muted mb-1">From</Form.Label>
              <Form.Control
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="col-6 col-md-3">
              <Form.Label className="small text-muted mb-1">To</Form.Label>
              <Form.Control
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="col-12 col-md-3">
              <Button variant="outline-secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-hover align-middle mb-3">
              <thead className="table-light">
                <tr>
                  <th>Date and time</th>
                  <th>Customer</th>
                  <th>Event</th>
                  <th>Venue</th>
                  <th className="text-end">Guests</th>
                  <th>Package</th>
                  <th className="text-end">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading reservations
                    </td>
                  </tr>
                )}

                {!loading && reservations.length === 0 && (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-4">
                      No reservations found.
                    </td>
                  </tr>
                )}

                {!loading &&
                  reservations.map((r) => (
                    <tr key={r._id}>
                      <td className="text-nowrap">
                        <div className="fw-semibold">{formatEventDate(r.eventDate)}</div>
                        <small className="text-muted">{formatTime(r.startTime)}</small>
                      </td>
                      <td>{r.customer?.fullName || '-'}</td>
                      <td>{eventTypeLabel(r.eventType)}</td>
                      <td>{r.venue}</td>
                      <td className="text-end">{r.guestCount}</td>
                      <td>{r.package?.name || '-'}</td>
                      <td className="text-end text-nowrap">{formatCurrency(r.totalAmount)}</td>
                      <td>
                        <span
                          className={`badge text-bg-${
                            paymentVariant[r.paymentSummary?.paymentStatus] || 'secondary'
                          }`}
                        >
                          {r.paymentSummary?.paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td>
                        <Form.Select
                          size="sm"
                          value={r.status}
                          disabled={updatingId === r._id}
                          onChange={(e) => changeStatus(r, e.target.value)}
                          className={`border-${statusVariant[r.status]}`}
                          style={{ minWidth: 125 }}
                          aria-label="Change status"
                        >
                          {RESERVATION_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td className="text-end text-nowrap">
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          className="me-1"
                          onClick={() => setDetail(r)}
                          aria-label="View details"
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-1"
                          onClick={() => openEdit(r)}
                          aria-label="Edit reservation"
                        >
                          <i className="bi bi-pencil"></i>
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setDeleteTarget(r)}
                            aria-label="Delete reservation"
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

      <Modal show={showForm} onHide={() => setShowForm(false)} centered size="lg">
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">
              {editing ? 'Edit reservation' : 'Add reservation'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            {conflicts.length > 0 && (
              <div className="alert alert-warning py-2">
                <i className="bi bi-exclamation-triangle me-2"></i>
                Possible double booking: {conflicts.length} confirmed event(s) already at this
                date and time
                {conflicts[0]?.customer?.fullName
                  ? ` (${conflicts.map((c) => c.customer?.fullName).filter(Boolean).join(', ')})`
                  : ''}
                .
              </div>
            )}

            <div className="row">
              <Form.Group className="mb-3 col-md-6" controlId="customer">
                <Form.Label>Customer</Form.Label>
                <Form.Select name="customer" value={form.customer} onChange={handleChange} required>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName}
                    </option>
                  ))}
                </Form.Select>
                {customers.length === 0 && (
                  <Form.Text className="text-muted">Add a customer first.</Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="eventType">
                <Form.Label>Event type</Form.Label>
                <Form.Select name="eventType" value={form.eventType} onChange={handleChange}>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {eventTypeLabel(type)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="eventDate">
                <Form.Label>Event date</Form.Label>
                <Form.Control
                  type="date"
                  name="eventDate"
                  value={form.eventDate}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="startTime">
                <Form.Label>Start time</Form.Label>
                <Form.Control
                  type="time"
                  name="startTime"
                  value={form.startTime}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-8" controlId="venue">
                <Form.Label>Venue</Form.Label>
                <Form.Control name="venue" value={form.venue} onChange={handleChange} required />
              </Form.Group>

              <Form.Group className="mb-3 col-md-4" controlId="guestCount">
                <Form.Label>Guests</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  name="guestCount"
                  value={form.guestCount}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="package">
                <Form.Label>Package</Form.Label>
                <Form.Select name="package" value={form.package} onChange={handleChange} required>
                  <option value="">Select package</option>
                  {packageOptions.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({formatCurrency(p.price)}
                      {p.pricingType === 'per_head' ? ' / head' : ' fixed'})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-md-6" controlId="status">
                <Form.Label>Status</Form.Label>
                <Form.Select name="status" value={form.status} onChange={handleChange}>
                  {RESERVATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>

            <Form.Group className="mb-3" controlId="notes">
              <Form.Label>Notes (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="notes"
                value={form.notes}
                onChange={handleChange}
              />
            </Form.Group>

            {estimatedTotal !== null && (
              <div className="bg-light rounded p-2">
                Estimated total: <strong>{formatCurrency(estimatedTotal)}</strong>
              </div>
            )}
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

      <ReservationDetailModal reservation={detail} onHide={() => setDetail(null)} />

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Delete reservation"
        message={`Delete the reservation of ${
          deleteTarget?.customer?.fullName || 'this customer'
        }? Its payments and preparation tasks will also be deleted.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}