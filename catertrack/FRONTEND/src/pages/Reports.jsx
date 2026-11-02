import { useEffect, useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import api, { getErrorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import {
  eventTypeLabel,
  formatCurrency,
  formatEventDate,
  formatTime,
  toLocalDateInput
} from '../utils/format';
import { methodLabel, statusVariant } from '../utils/status';

const TABS = [
  { key: 'reservations', label: 'Reservations' },
  { key: 'payments', label: 'Payments' },
  { key: 'schedules', label: 'Schedule' }
];

const monthRange = () => {
  const now = new Date();
  return {
    startDate: toLocalDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toLocalDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0))
  };
};

function StatCard({ label, value, tone = '' }) {
  return (
    <div className="col-12 col-md-4">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body">
          <div className="text-muted small">{label}</div>
          <div className={`fs-4 fw-semibold ${tone}`}>{value}</div>
        </div>
      </div>
    </div>
  );
}

export default function Reports() {
  const { showToast } = useToast();

  const [tab, setTab] = useState('reservations');
  const [filters, setFilters] = useState(monthRange);
  const [applied, setApplied] = useState(filters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setReport(null);

    api
      .get(`/reports/${tab}`, { params: applied })
      .then((res) => {
        if (active) setReport(res.data);
      })
      .catch((err) => showToast(getErrorMessage(err), 'danger'))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tab, applied, showToast]);

  const handleFilterChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generate = () => {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      showToast('The start date must be before the end date', 'warning');
      return;
    }
    setApplied({ ...filters });
  };

  const exportCsv = async () => {
    try {
      const res = await api.get(`/reports/export/${tab}`, {
        params: applied,
        responseType: 'blob'
      });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${tab}-report.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('The report could not be exported', 'danger');
    }
  };

  const tabLabel = TABS.find((t) => t.key === tab)?.label;
  const canExport = tab === 'reservations' || tab === 'payments';

  const activeSummary = (report?.summary || []).filter((row) => row._id !== 'Cancelled');
  const totalValue = activeSummary.reduce((sum, row) => sum + row.totalRevenue, 0);
  const totalGuests = activeSummary.reduce((sum, row) => sum + row.totalGuests, 0);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3 no-print">
        <h1 className="h3 mb-0">Reports</h1>
        <div className="d-flex gap-2">
          {canExport && (
            <Button variant="outline-success" onClick={exportCsv}>
              <i className="bi bi-filetype-csv me-1"></i>
              Export CSV
            </Button>
          )}
          <Button variant="outline-secondary" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i>
            Print
          </Button>
        </div>
      </div>

      <div className="d-none d-print-block mb-3">
        <h1 className="h4 mb-1">CaterTrack report: {tabLabel}</h1>
        <div>
          Period: {applied.startDate ? formatEventDate(applied.startDate) : 'Start'} to{' '}
          {applied.endDate ? formatEventDate(applied.endDate) : 'Present'}
        </div>
      </div>

      <ul className="nav nav-tabs mb-3 no-print">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="card border-0 shadow-sm mb-3 no-print">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-3">
              <Form.Label className="small text-muted mb-1">From</Form.Label>
              <Form.Control
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-6 col-md-3">
              <Form.Label className="small text-muted mb-1">To</Form.Label>
              <Form.Control
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>
            <div className="col-12 col-md-3">
              <Button onClick={generate} disabled={loading}>
                Generate report
              </Button>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}

      {!loading && report && tab === 'reservations' && (
        <>
          <div className="row g-3 mb-3">
            <StatCard label="Reservations (all statuses)" value={report.count} />
            <StatCard label="Total value (excluding cancelled)" value={formatCurrency(totalValue)} />
            <StatCard label="Total guests (excluding cancelled)" value={totalGuests} />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h2 className="h6">By status</h2>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Status</th>
                          <th className="text-end">Count</th>
                          <th className="text-end">Guests</th>
                          <th className="text-end">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.summary.length === 0 && (
                          <tr>
                            <td colSpan="4" className="text-center text-muted py-3">
                              No data.
                            </td>
                          </tr>
                        )}
                        {report.summary.map((row) => (
                          <tr key={row._id}>
                            <td>
                              <span className={`badge text-bg-${statusVariant[row._id]}`}>
                                {row._id}
                              </span>
                            </td>
                            <td className="text-end">{row.count}</td>
                            <td className="text-end">{row.totalGuests}</td>
                            <td className="text-end text-nowrap">
                              {formatCurrency(row.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <h2 className="h6">By event type</h2>
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Event type</th>
                          <th className="text-end">Count</th>
                          <th className="text-end">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byEventType.length === 0 && (
                          <tr>
                            <td colSpan="3" className="text-center text-muted py-3">
                              No data.
                            </td>
                          </tr>
                        )}
                        {report.byEventType.map((row) => (
                          <tr key={row._id}>
                            <td>{eventTypeLabel(row._id)}</td>
                            <td className="text-end">{row.count}</td>
                            <td className="text-end text-nowrap">
                              {formatCurrency(row.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h6">Reservation list</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Customer</th>
                      <th>Event</th>
                      <th>Venue</th>
                      <th className="text-end">Guests</th>
                      <th>Package</th>
                      <th className="text-end">Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.length === 0 && (
                      <tr>
                        <td colSpan="9" className="text-center text-muted py-3">
                          No reservations in this period.
                        </td>
                      </tr>
                    )}
                    {report.data.map((r) => (
                      <tr key={r._id}>
                        <td className="text-nowrap">{formatEventDate(r.eventDate)}</td>
                        <td className="text-nowrap">{formatTime(r.startTime)}</td>
                        <td>{r.customer?.fullName || '-'}</td>
                        <td>{eventTypeLabel(r.eventType)}</td>
                        <td>{r.venue}</td>
                        <td className="text-end">{r.guestCount}</td>
                        <td>{r.package?.name || '-'}</td>
                        <td className="text-end text-nowrap">{formatCurrency(r.totalAmount)}</td>
                        <td>
                          <span className={`badge text-bg-${statusVariant[r.status]}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && report && tab === 'payments' && (
        <>
          <div className="row g-3 mb-3">
            <StatCard
              label="Total collected"
              value={formatCurrency(report.grandTotal)}
              tone="text-success"
            />
            <StatCard label="Transactions" value={report.totalTransactions} />
          </div>

          <div className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <h2 className="h6">By payment method</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Method</th>
                      <th className="text-end">Transactions</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.byMethod.length === 0 && (
                      <tr>
                        <td colSpan="3" className="text-center text-muted py-3">
                          No data.
                        </td>
                      </tr>
                    )}
                    {report.byMethod.map((row) => (
                      <tr key={row._id}>
                        <td>{methodLabel[row._id] || row._id}</td>
                        <td className="text-end">{row.transactions}</td>
                        <td className="text-end text-nowrap">{formatCurrency(row.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h2 className="h6">Payment list</h2>
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Event</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th>Recorded by</th>
                      <th className="text-end">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center text-muted py-3">
                          No payments in this period.
                        </td>
                      </tr>
                    )}
                    {report.data.map((p) => (
                      <tr key={p._id}>
                        <td className="text-nowrap">{formatEventDate(p.paymentDate)}</td>
                        <td>{p.reservation?.customer?.fullName || '-'}</td>
                        <td>{eventTypeLabel(p.reservation?.eventType)}</td>
                        <td>{methodLabel[p.method] || p.method}</td>
                        <td>{p.referenceNo || '-'}</td>
                        <td>{p.recordedBy?.name || '-'}</td>
                        <td className="text-end text-nowrap fw-semibold">
                          {formatCurrency(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!loading && report && tab === 'schedules' && (
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            <h2 className="h6">Events ({report.count})</h2>
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Event</th>
                    <th>Venue</th>
                    <th className="text-end">Guests</th>
                    <th>Package</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-3">
                        No events in this period.
                      </td>
                    </tr>
                  )}
                  {report.data.map((r) => (
                    <tr key={r._id}>
                      <td className="text-nowrap">{formatEventDate(r.eventDate)}</td>
                      <td className="text-nowrap">{formatTime(r.startTime)}</td>
                      <td>{r.customer?.fullName || '-'}</td>
                      <td>{r.customer?.contactNumber || '-'}</td>
                      <td>{eventTypeLabel(r.eventType)}</td>
                      <td>{r.venue}</td>
                      <td className="text-end">{r.guestCount}</td>
                      <td>{r.package?.name || '-'}</td>
                      <td>
                        <span className={`badge text-bg-${statusVariant[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}