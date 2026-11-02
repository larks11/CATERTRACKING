const express = require('express');
const router = express.Router();

const {
  getReservationSummaryReport,
  getPaymentSummaryReport,
  getScheduleSummaryReport,
  exportReservationsCSV,
  exportPaymentsCSV
} = require('../controllers/reportController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

// Reports are restricted to Admin role
router.use(protect, authorize('admin'));

router.get('/reservations', getReservationSummaryReport);
router.get('/payments', getPaymentSummaryReport);
router.get('/schedules', getScheduleSummaryReport);
router.get('/export/reservations', exportReservationsCSV);
router.get('/export/payments', exportPaymentsCSV);

module.exports = router;
