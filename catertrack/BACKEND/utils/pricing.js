/**
 * Pricing and Reservation Calculation Utilities
 * Pure functions decoupled from database operations for fast unit testing.
 */

function calculateReservationTotal(pkg, guestCount) {
  if (!pkg || typeof pkg.price !== 'number' || pkg.price < 0) {
    throw new Error('Valid package with non-negative price is required');
  }

  const count = parseInt(guestCount, 10);
  if (isNaN(count) || count < 1) {
    throw new Error('Guest count must be at least 1');
  }

  if (pkg.pricingType === 'per_head') {
    return Math.round(pkg.price * count * 100) / 100;
  }

  if (pkg.pricingType === 'fixed') {
    return Math.round(pkg.price * 100) / 100;
  }

  throw new Error(`Invalid package pricing type: ${pkg.pricingType}`);
}

function computePaymentSummary(totalAmount, payments = []) {
  const amountDue = typeof totalAmount === 'number' ? totalAmount : 0;
  
  const totalPaid = payments.reduce((sum, p) => {
    const val = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount) || 0;
    return sum + (val > 0 ? val : 0);
  }, 0);

  const roundedPaid = Math.round(totalPaid * 100) / 100;
  const balance = Math.max(0, Math.round((amountDue - roundedPaid) * 100) / 100);

  let paymentStatus = 'Unpaid';
  if (roundedPaid >= amountDue && amountDue > 0) {
    paymentStatus = 'Paid';
  } else if (roundedPaid > 0) {
    paymentStatus = 'Partial';
  }

  return {
    totalDue: amountDue,
    totalPaid: roundedPaid,
    balance,
    paymentStatus
  };
}

function checkDoubleBookingConflict(existingEvents = [], newDateStr, newTimeStr) {
  if (!newDateStr || !newTimeStr) return false;

  const targetDateOnly = new Date(newDateStr).toISOString().split('T')[0];

  return existingEvents.some((ev) => {
    if (ev.status !== 'Confirmed') return false;
    const evDateOnly = new Date(ev.eventDate).toISOString().split('T')[0];
    return evDateOnly === targetDateOnly && ev.startTime === newTimeStr;
  });
}

module.exports = {
  calculateReservationTotal,
  computePaymentSummary,
  checkDoubleBookingConflict
};
