const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateReservationTotal,
  computePaymentSummary,
  checkDoubleBookingConflict
} = require('./pricing.js');

test('calculateReservationTotal correctly calculates per_head package', () => {
  const pkg = { pricingType: 'per_head', price: 450 };
  const total = calculateReservationTotal(pkg, 100);
  assert.equal(total, 45000);
});

test('calculateReservationTotal correctly calculates fixed price package regardless of guest count', () => {
  const pkg = { pricingType: 'fixed', price: 28000 };
  const total = calculateReservationTotal(pkg, 50);
  assert.equal(total, 28000);
});

test('calculateReservationTotal throws on invalid guest count', () => {
  const pkg = { pricingType: 'per_head', price: 450 };
  assert.throws(() => calculateReservationTotal(pkg, 0), /Guest count must be at least 1/);
});

test('computePaymentSummary calculates Unpaid status when no payments recorded', () => {
  const summary = computePaymentSummary(50000, []);
  assert.deepEqual(summary, {
    totalDue: 50000,
    totalPaid: 0,
    balance: 50000,
    paymentStatus: 'Unpaid'
  });
});

test('computePaymentSummary calculates Partial status when partial payments recorded', () => {
  const payments = [{ amount: 15000 }, { amount: 10000 }];
  const summary = computePaymentSummary(50000, payments);
  assert.deepEqual(summary, {
    totalDue: 50000,
    totalPaid: 25000,
    balance: 25000,
    paymentStatus: 'Partial'
  });
});

test('computePaymentSummary calculates Paid status when full amount paid', () => {
  const payments = [{ amount: 30000 }, { amount: 20000 }];
  const summary = computePaymentSummary(50000, payments);
  assert.deepEqual(summary, {
    totalDue: 50000,
    totalPaid: 50000,
    balance: 0,
    paymentStatus: 'Paid'
  });
});

test('checkDoubleBookingConflict detects conflict on same date and start time for Confirmed events', () => {
  const existingEvents = [
    {
      eventDate: '2026-11-20T00:00:00.000Z',
      startTime: '14:00',
      status: 'Confirmed'
    },
    {
      eventDate: '2026-11-20T00:00:00.000Z',
      startTime: '18:00',
      status: 'Pending'
    }
  ];

  // Conflict on 14:00
  assert.equal(
    checkDoubleBookingConflict(existingEvents, '2026-11-20', '14:00'),
    true
  );

  // Different time on same date -> no conflict
  assert.equal(
    checkDoubleBookingConflict(existingEvents, '2026-11-20', '16:00'),
    false
  );

  // Overlapping with Pending event -> false (conflict only for confirmed)
  assert.equal(
    checkDoubleBookingConflict(existingEvents, '2026-11-20', '18:00'),
    false
  );
});
