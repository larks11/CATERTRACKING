const Payment = require('../models/Payment');
const Reservation = require('../models/Reservation');
const { computePaymentSummary } = require('../utils/pricing');

// Get all payments (with optional reservation filter)
const getPayments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const skip = (page - 1) * limit;
    const { reservationId, method } = req.query;

    const filter = {};
    if (reservationId) {
      filter.reservation = reservationId;
    }
    if (method && ['cash', 'GCash', 'bank_transfer'].includes(method)) {
      filter.method = method;
    }

    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate({
        path: 'reservation',
        select: 'eventType eventDate startTime venue totalAmount status',
        populate: {
          path: 'customer',
          select: 'fullName contactNumber email'
        }
      })
      .populate('recordedBy', 'name username')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: payments
    });
  } catch (err) {
    next(err);
  }
};

// Record new payment for a reservation
const createPayment = async (req, res, next) => {
  try {
    const { reservation: reservationId, amount, paymentDate, method, referenceNo } = req.body;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    const payment = await Payment.create({
      reservation: reservation._id,
      amount: paymentAmount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      method,
      referenceNo,
      recordedBy: req.user._id
    });

    // Compute updated financial summary
    const allPayments = await Payment.find({ reservation: reservation._id });
    const summary = computePaymentSummary(reservation.totalAmount, allPayments);

    res.status(201).json({
      success: true,
      data: payment,
      summary
    });
  } catch (err) {
    next(err);
  }
};

// Get payment summary for a specific reservation
const getReservationPaymentSummary = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const payments = await Payment.find({ reservation: reservation._id })
      .populate('recordedBy', 'name username')
      .sort({ paymentDate: -1 });

    const summary = computePaymentSummary(reservation.totalAmount, payments);

    res.status(200).json({
      success: true,
      data: {
        reservationId: reservation._id,
        totalAmount: reservation.totalAmount,
        payments,
        summary
      }
    });
  } catch (err) {
    next(err);
  }
};

// Delete payment (Admin only)
const deletePayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    await Payment.findByIdAndDelete(payment._id);

    res.status(200).json({
      success: true,
      message: 'Payment record deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPayments,
  createPayment,
  getReservationPaymentSummary,
  deletePayment
};
