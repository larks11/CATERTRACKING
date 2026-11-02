export const RESERVATION_STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

export const EVENT_TYPES = ['birthday', 'wedding', 'meeting', 'other'];

export const statusVariant = {
  Pending: 'warning',
  Confirmed: 'success',
  Completed: 'secondary',
  Cancelled: 'danger'
};

export const statusColor = {
  Pending: '#f0ad4e',
  Confirmed: '#198754',
  Completed: '#6c757d',
  Cancelled: '#dc3545'
};

export const paymentVariant = {
  Unpaid: 'danger',
  Partial: 'warning',
  Paid: 'success'
};

export const PAYMENT_METHODS = ['cash', 'GCash', 'bank_transfer'];

export const methodLabel = {
  cash: 'Cash',
  GCash: 'GCash',
  bank_transfer: 'Bank transfer'
};

export const TASK_STATUSES = ['Pending', 'In Progress', 'Completed'];

export const taskVariant = {
  Pending: 'warning',
  'In Progress': 'info',
  Completed: 'success'
};