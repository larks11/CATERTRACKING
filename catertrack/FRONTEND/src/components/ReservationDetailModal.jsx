import { Button, Modal } from 'react-bootstrap';
import {
  eventTypeLabel,
  formatCurrency,
  formatEventDate,
  formatTime
} from '../utils/format';
import { paymentVariant, statusVariant } from '../utils/status';

function Row({ label, children }) {
  return (
    <div className="row mb-2">
      <div className="col-5 text-muted">{label}</div>
      <div className="col-7">{children}</div>
    </div>
  );
}

export default function ReservationDetailModal({ reservation, onHide }) {
  const r = reservation;
  const summary = r?.paymentSummary || {};

  return (
    <Modal show={Boolean(r)} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">Reservation details</Modal.Title>
      </Modal.Header>

      {r && (
        <Modal.Body>
          <Row label="Customer">
            <div className="fw-semibold">{r.customer?.fullName || '-'}</div>
            <small className="text-muted">{r.customer?.contactNumber}</small>
          </Row>
          <Row label="Event">{eventTypeLabel(r.eventType)}</Row>
          <Row label="Date">{formatEventDate(r.eventDate)}</Row>
          <Row label="Start time">{formatTime(r.startTime)}</Row>
          <Row label="Venue">{r.venue}</Row>
          <Row label="Guests">{r.guestCount}</Row>
          <Row label="Package">{r.package?.name || '-'}</Row>
          <Row label="Status">
            <span className={`badge text-bg-${statusVariant[r.status]}`}>{r.status}</span>
          </Row>
          <Row label="Total">{formatCurrency(r.totalAmount)}</Row>
          <Row label="Paid">{formatCurrency(summary.totalPaid)}</Row>
          <Row label="Balance">{formatCurrency(summary.balance)}</Row>
          <Row label="Payment">
            <span className={`badge text-bg-${paymentVariant[summary.paymentStatus] || 'secondary'}`}>
              {summary.paymentStatus || 'Unpaid'}
            </span>
          </Row>
          {r.notes && <Row label="Notes">{r.notes}</Row>}
        </Modal.Body>
      )}

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}