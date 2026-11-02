import { Button, Modal, Spinner } from 'react-bootstrap';

export default function ConfirmModal({
  show,
  title = 'Confirm',
  message,
  confirmText = 'Delete',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner animation="border" size="sm" /> : confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}