import { useEffect, useMemo, useState } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import api, { getErrorMessage } from '../api/axios';
import { useToast } from '../context/ToastContext';
import ReservationDetailModal from '../components/ReservationDetailModal';
import {
  eventTypeLabel,
  formatCurrency,
  formatEventDate,
  formatTime,
  toDateInput,
  toLocalDateInput
} from '../utils/format';
import {
  RESERVATION_STATUSES,
  paymentVariant,
  statusColor,
  statusVariant
} from '../utils/status';

export default function Schedule() {
  const { showToast } = useToast();

  const [view, setView] = useState('calendar');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const params = { limit: 500 };
    if (status) params.status = status;

    if (view === 'calendar') {
      if (!range) return undefined;
      params.startDate = range.start;
      params.endDate = range.end;
    } else {
      params.startDate = toLocalDateInput(new Date());
    }

    let active = true;
    setLoading(true);

    api
      .get('/reservations', { params })
      .then((res) => {
        if (active) setReservations(res.data.data);
      })
      .catch((err) => showToast(getErrorMessage(err), 'danger'))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [view, status, range, showToast]);

  const events = useMemo(
    () =>
      reservations.map((r) => ({
        id: r._id,
        title: `${r.customer?.fullName || 'Customer'} (${eventTypeLabel(r.eventType)})`,
        start: `${toDateInput(r.eventDate)}T${r.startTime}`,
        backgroundColor: statusColor[r.status],
        borderColor: statusColor[r.status]
      })),
    [reservations]
  );

  const handleDatesSet = (info) => {
    const end = new Date(info.end);
    end.setDate(end.getDate() - 1);
    const next = { start: toLocalDateInput(info.start), end: toLocalDateInput(end) };
    setRange((prev) =>
      prev && prev.start === next.start && prev.end === next.end ? prev : next
    );
  };

  const handleEventClick = (info) => {
    const found = reservations.find((r) => r._id === info.event.id);
    if (found) setSelected(found);
  };

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h1 className="h3 mb-0">Schedule</h1>

        <div className="d-flex flex-wrap align-items-center gap-2">
          <Form.Select
            size="sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{ width: 160 }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {RESERVATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>

          <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
            <button
              type="button"
              className={`btn ${view === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setView('calendar')}
            >
              <i className="bi bi-calendar3 me-1"></i>
              Calendar
            </button>
            <button
              type="button"
              className={`btn ${view === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setView('list')}
            >
              <i className="bi bi-list-ul me-1"></i>
              Upcoming list
            </button>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        {RESERVATION_STATUSES.map((s) => (
          <span key={s} className={`badge text-bg-${statusVariant[s]}`}>
            {s}
          </span>
        ))}
        {loading && <Spinner animation="border" size="sm" />}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {view === 'calendar' && (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={events}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              dayMaxEvents={3}
              height="auto"
            />
          )}

          {view === 'list' && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Event</th>
                    <th>Venue</th>
                    <th className="text-end">Guests</th>
                    <th>Status</th>
                    <th className="text-end">Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && reservations.length === 0 && (
                    <tr>
                      <td colSpan="9" className="text-center text-muted py-4">
                        No upcoming events.
                      </td>
                    </tr>
                  )}

                  {reservations.map((r) => (
                    <tr key={r._id}>
                      <td className="text-nowrap fw-semibold">{formatEventDate(r.eventDate)}</td>
                      <td className="text-nowrap">{formatTime(r.startTime)}</td>
                      <td>{r.customer?.fullName || '-'}</td>
                      <td>{eventTypeLabel(r.eventType)}</td>
                      <td>{r.venue}</td>
                      <td className="text-end">{r.guestCount}</td>
                      <td>
                        <span className={`badge text-bg-${statusVariant[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="text-end text-nowrap">
                        <span
                          className={`badge me-2 text-bg-${
                            paymentVariant[r.paymentSummary?.paymentStatus] || 'secondary'
                          }`}
                        >
                          {r.paymentSummary?.paymentStatus || 'Unpaid'}
                        </span>
                        {formatCurrency(r.paymentSummary?.balance)}
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => setSelected(r)}
                          aria-label="View details"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ReservationDetailModal reservation={selected} onHide={() => setSelected(null)} />
    </div>
  );
}