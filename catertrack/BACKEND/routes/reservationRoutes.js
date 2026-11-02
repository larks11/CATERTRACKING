const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getReservations,
  getReservationById,
  checkDoubleBooking,
  createReservation,
  updateReservation,
  updateReservationStatus,
  deleteReservation
} = require('../controllers/reservationController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    return res.status(400).json({
      success: false,
      message: errors.array().map((e) => e.msg).join(', ')
    });
  };
};

router.use(protect);

router.get('/', getReservations);
router.get('/check-conflict', checkDoubleBooking);
router.get('/:id', getReservationById);

router.post(
  '/',
  validate([
    body('customer').isMongoId().withMessage('Valid customer ID is required'),
    body('eventType').isIn(['birthday', 'wedding', 'meeting', 'other']).withMessage('Valid event type is required'),
    body('eventDate').isISO8601().withMessage('Valid event date is required'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Valid start time (HH:mm) is required'),
    body('venue').trim().notEmpty().withMessage('Venue is required'),
    body('guestCount').isInt({ min: 1 }).withMessage('Guest count must be at least 1'),
    body('package').isMongoId().withMessage('Valid package ID is required')
  ]),
  createReservation
);

router.put(
  '/:id',
  validate([
    body('guestCount').optional().isInt({ min: 1 }).withMessage('Guest count must be at least 1')
  ]),
  updateReservation
);

router.patch(
  '/:id/status',
  validate([
    body('status').isIn(['Pending', 'Confirmed', 'Completed', 'Cancelled']).withMessage('Valid status is required')
  ]),
  updateReservationStatus
);

router.delete('/:id', authorize('admin'), deleteReservation);

module.exports = router;
