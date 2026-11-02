const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getPayments,
  createPayment,
  getReservationPaymentSummary,
  deletePayment
} = require('../controllers/paymentController');

const { protect } = require('../middleware/auth');
const { authorize, checkPaymentPermission } = require('../middleware/roles');

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

router.get('/', getPayments);
router.get('/summary/:reservationId', getReservationPaymentSummary);

// Only Admin or Staff with canRecordPayments === true can create payments
router.post(
  '/',
  checkPaymentPermission,
  validate([
    body('reservation').isMongoId().withMessage('Valid reservation ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('method').isIn(['cash', 'GCash', 'bank_transfer']).withMessage('Valid payment method is required')
  ]),
  createPayment
);

router.delete('/:id', authorize('admin'), deletePayment);

module.exports = router;
