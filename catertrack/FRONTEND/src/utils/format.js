const currency = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP'
});

export const formatCurrency = (value) => currency.format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatEventDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

export const formatTime = (value) => {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, '0')} ${period}`;
};

export const toDateInput = (value) => new Date(value).toISOString().slice(0, 10);

export const toLocalDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const eventTypeLabel = (type) =>
  type ? type.charAt(0).toUpperCase() + type.slice(1) : '';