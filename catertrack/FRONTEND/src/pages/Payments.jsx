import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import {
  eventTypeLabel,
  formatCurrency,
  formatEventDate,
  toLocalDateInput
} from '../utils/format';
import { PAYMENT_METHODS, methodLabel, paymentVariant } from '../utils/status';

const PAGE_SIZE = 10;

const emptyForm = () => ({
  reservation: '',
  amount: '',
  paymentDate: toLocalDateInput(new Date()),
  method: 'cash',
  referenceNo: ''
});

export default function Payments() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [tab, setTab] = useState('balances');

  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [method, setMethod] = useState('');
  const [loadingPayments, setLoadingPayments] = useState(true);

  const [reservations, setReservations] = useState([]);
  const [balanceFilter, setBalanceFilter] = useState('');
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (method) params.method = method;
      const res = await api.get('/payments', { params });
      setPayments(res.data.data);
      setPages(res.data.pages);
      setTotal(res.data.total);
      if (page > res.data.pages) setPage(res.data.pages);
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoadingPayments(false);
    }
  }, [page, method, showToast]);

  const loadReservations = useCallback(async () => {
    setLoadingReservations(true);
    try {
      const res = await api.get('/reservations', { params: { limit: 500 } });
      setReservations(res.data.data.filter((r) => r.status !== 'Cancelled'));
    } catch (err) {
      showToast(getErrorMessage(err), 'danger');
    } finally {
      setLoadingReservations(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  const refreshAll = () => {
    loadPayments();
    loadReservations();
  };

  const totals = useMemo(
    () =>
      reservations.reduce(
        (acc, r) => ({
          billed: acc.billed + (r.totalAmount || 0),
          collected: acc.collected + (r.paymentSummary?.totalPaid || 0),
          outstanding: acc.outstanding + (r.paymentSummary?.balance || 0)
        }),
        { billed: 0, collected: 0, outstanding: 0 }
      ),
    [reservations]
  );

  const visibleBalances = reservations.filter(
    (r) => !balanceFilter || r.paymentSummary?.paymentStatus === balanceFilter
  );

  const payable = reservations.filter((r) => (r.paymentSummary?.balance || 0) > 0);
  const selected = reservations.find((r) => r._id === form.reservation);
  const balance = selected?.paymentSummary?.balance ?? 0;

  const openRecord = (reservationId = '') => {
    setForm({ ...emptyForm(), reservation: reservationId });
    setFormError('');
    setShowForm(true);
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');

    const amount = Number(form.amount);
    if (amount > balance + 0.001) {
      setFormError(`Amount cannot be more than the balance (${formatCurrency(balance)}).`);
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/payments', {
        reservation: form.reservation,
        amount,
        paymentDate: form.paymentDate,
        method: form.method,
        referenceNo: form.referenceNo
      });
      const status = res.data.summary?.paymentStatus;
      showToast(status === 'Paid' ? 'Payment recorded. Fully paid.' : 'Payment recorded');
      setShowForm(false);
      refreshAll();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.delete(`/payments/${deleteTarget._id}`);
      showToast(res.data.message || 'Payment deleted');
      setDeleteTarget(null);
      refreshAll();
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
        <h1 className="h3 mb-0">Payments</h1>
        <Button onClick={() => openRecord()}>
          <i className="bi bi-plus-lg me-1"></i>
          Record payment
        </Button>
      </div>

      <div className="row g-3 mb-3">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Total billed</div>
              <div className="fs-4 fw-semibold">{formatCurrency(totals.billed)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Collected</div>
              <div className="fs-4 fw-semibold text-success">
                {formatCurrency(totals.collected)}
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="text-muted small">Outstanding balance</div>
              <div className="fs-4 fw-semibold text-danger">
                {formatCurrency(totals.outstanding)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'balances' ? 'active' : ''}`}
            onClick={() => setTab('balances')}
          >
            Balances
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${tab === 'records' ? 'active' : ''}`}
            onClick={() => setTab('records')}
          >
            Payment records
          </button>
        </li>
      </ul>

      {tab === 'balances' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <Form.Select
              size="sm"
              className="mb-3"
              style={{ maxWidth: 200 }}
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="">All payment statuses</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </Form.Select>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Event date</th>
                    <th>Customer</th>
                    <th>Event</th>
                    <th className="text-end">Total</th>
                    <th className="text-end">Paid</th>
                    <th className="text-end">Balance</th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingReservations && (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading balances
                      </td>
                    </tr>
                  )}

                  {!loadingReservations && visibleBalances.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        No reservations found.
                      </td>
                    </tr>
                  )}

                  {!loadingReservations &&
                    visibleBalances.map((r) => {
                      const summary = r.paymentSummary || {};
                      return (
                        <tr key={r._id}>
                          <td className="text-nowrap">{formatEventDate(r.eventDate)}</td>
                          <td>{r.customer?.fullName || '-'}</td>
                          <td>{eventTypeLabel(r.eventType)}</td>
                          <td className="text-end text-nowrap">{formatCurrency(r.totalAmount)}</td>
                          <td className="text-end text-nowrap">
                            {formatCurrency(summary.totalPaid)}
                          </td>
                          <td className="text-end text-nowrap fw-semibold">
                            {formatCurrency(summary.balance)}
                          </td>
                          <td>
                            <span
                              className={`badge text-bg-${
                                paymentVariant[summary.paymentStatus] || 'secondary'
                              }`}
                            >
                              {summary.paymentStatus || 'Unpaid'}
                            </span>
                          </td>
                          <td className="text-end">
                            {(summary.balance || 0) > 0 && (
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => openRecord(r._id)}
                              >
                                Record payment
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'records' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <Form.Select
              size="sm"
              className="mb-3"
              style={{ maxWidth: 200 }}
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by method"
            >
              <option value="">All methods</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {methodLabel[m]}
                </option>
              ))}
            </Form.Select>

            <div className="table-responsive">
              <table className="table table-hover align-middle mb-3">
                <thead className="table-light">
                  <tr>
                    <th>Payment date</th>
                    <th>Customer</th>
                    <th>Event</th>
                    <th className="text-end">Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Recorded by</th>
                    {isAdmin && <th className="text-end">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {loadingPayments && (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="text-center py-4">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Loading payments
                      </td>
                    </tr>
                  )}

                  {!loadingPayments && payments.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="text-center text-muted py-4">
                        No payments recorded yet.
                      </td>
                    </tr>
                  )}

                  {!loadingPayments &&
                    payments.map((p) => (
                      <tr key={p._id}>
                        <td className="text-nowrap">{formatEventDate(p.paymentDate)}</td>
                        <td>{p.reservation?.customer?.fullName || '-'}</td>
                        <td className="text-nowrap">
                          {eventTypeLabel(p.reservation?.eventType)}
                          <small className="text-muted d-block">
                            {formatEventDate(p.reservation?.eventDate)}
                          </small>
                        </td>
                        <td className="text-end text-nowrap fw-semibold">
                          {formatCurrency(p.amount)}
                        </td>
                        <td>{methodLabel[p.method] || p.method}</td>
                        <td>{p.referenceNo || '-'}</td>
                        <td>{p.recordedBy?.name || '-'}</td>
                        {isAdmin && (
                          <td className="text-end">
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => setDeleteTarget(p)}
                              aria-label="Delete payment"
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pages={pages} total={total} onChange={setPage} />
          </div>
        </div>
      )}

      <Modal show={showForm} onHide={() => setShowForm(false)} centered>
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">Record payment</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <div className="alert alert-danger py-2">{formError}</div>}

            <Form.Group className="mb-3" controlId="reservation">
              <Form.Label>Reservation</Form.Label>
              <Form.Select
                name="reservation"
                value={form.reservation}
                onChange={handleChange}
                required
              >
                <option value="">Select reservation</option>
                {payable.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.customer?.fullName} - {formatEventDate(r.eventDate)} (balance{' '}
                    {formatCurrency(r.paymentSummary?.balance)})
                  </option>
                ))}
              </Form.Select>
              {payable.length === 0 && (
                <Form.Text className="text-muted">
                  No reservations with a balance.
                </Form.Text>
              )}
            </Form.Group>

            {selected && (
              <div className="bg-light rounded p-2 mb-3 small">
                Total {formatCurrency(selected.totalAmount)}, paid{' '}
                {formatCurrency(selected.paymentSummary?.totalPaid)}, balance{' '}
                <strong>{formatCurrency(balance)}</strong>
              </div>
            )}

            <div className="row">
              <Form.Group className="mb-3 col-6" controlId="amount">
                <Form.Label>Amount (PHP)</Form.Label>
                <Form.Control
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selected ? balance : undefined}
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 col-6" controlId="paymentDate">
                <Form.Label>Payment date</Form.Label>
                <Form.Control
                  type="date"
                  name="paymentDate"
                  value={form.paymentDate}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3 col-6" controlId="method">
                <Form.Label>Method</Form.Label>
                <Form.Select name="method" value={form.method} onChange={handleChange}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {methodLabel[m]}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3 col-6" controlId="referenceNo">
                <Form.Label>Reference no. (optional)</Form.Label>
                <Form.Control
                  name="referenceNo"
                  value={form.referenceNo}
                  onChange={handleChange}
                />
              </Form.Group>
            </div>
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
              {saving ? <Spinner animation="border" size="sm" /> : 'Save payment'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={Boolean(deleteTarget)}
        title="Delete payment"
        message={`Delete the payment of ${formatCurrency(deleteTarget?.amount)}? The balance will be recomputed.`}
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}