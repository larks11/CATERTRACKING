const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');

// Reservation summary aggregation by date range
const getReservationSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.eventDate = {};
      if (startDate) matchStage.eventDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.eventDate.$lte = end;
      }
    }

    const summary = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalGuests: { $sum: '$guestCount' }
        }
      }
    ]);

    const byEventType = await Reservation.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const detailedList = await Reservation.find(matchStage)
      .populate('customer', 'fullName contactNumber')
      .populate('package', 'name price pricingType')
      .sort({ eventDate: 1 });

    res.status(200).json({
      success: true,
      summary,
      byEventType,
      count: detailedList.length,
      data: detailedList
    });
  } catch (err) {
    next(err);
  }
};

// Payment summary aggregation by date range
const getPaymentSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.paymentDate = {};
      if (startDate) matchStage.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.paymentDate.$lte = end;
      }
    }

    const byMethod = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$method',
          totalAmount: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      }
    ]);

    const grandTotalResult = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      }
    ]);

    const paymentsList = await Payment.find(matchStage)
      .populate({
        path: 'reservation',
        select: 'eventType eventDate venue totalAmount',
        populate: {
          path: 'customer',
          select: 'fullName contactNumber'
        }
      })
      .populate('recordedBy', 'name username')
      .sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      grandTotal: grandTotalResult[0]?.totalAmount || 0,
      totalTransactions: grandTotalResult[0]?.transactions || 0,
      byMethod,
      data: paymentsList
    });
  } catch (err) {
    next(err);
  }
};

// Schedule summary report
const getScheduleSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) filter.eventDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = end;
      }
    }

    const events = await Reservation.find(filter)
      .populate('customer', 'fullName contactNumber email')
      .populate('package', 'name price')
      .sort({ eventDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (err) {
    next(err);
  }
};

// Export Reservations to CSV string
const exportReservationsCSV = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) filter.eventDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = end;
      }
    }

    const reservations = await Reservation.find(filter)
      .populate('customer', 'fullName contactNumber')
      .populate('package', 'name')
      .sort({ eventDate: 1 });

    let csv = 'Reservation ID,Customer,Contact Number,Event Type,Date,Start Time,Venue,Guests,Package,Total Amount,Status\n';

    reservations.forEach((r) => {
      const dateStr = new Date(r.eventDate).toISOString().split('T')[0];
      const customerName = `"${(r.customer?.fullName || '').replace(/"/g, '""')}"`;
      const venue = `"${(r.venue || '').replace(/"/g, '""')}"`;
      const packageName = `"${(r.package?.name || '').replace(/"/g, '""')}"`;

      csv += `${r._id},${customerName},${r.customer?.contactNumber || ''},${r.eventType},${dateStr},${r.startTime},${venue},${r.guestCount},${packageName},${r.totalAmount},${r.status}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations-report.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

// Export Payments to CSV string
const exportPaymentsCSV = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }

    const payments = await Payment.find(filter)
      .populate({
        path: 'reservation',
        select: 'eventType venue',
        populate: { path: 'customer', select: 'fullName' }
      })
      .populate('recordedBy', 'name')
      .sort({ paymentDate: -1 });

    let csv = 'Payment ID,Payment Date,Customer,Event Type,Venue,Method,Reference No,Amount,Recorded By\n';

    payments.forEach((p) => {
      const dateStr = new Date(p.paymentDate).toISOString().split('T')[0];
      const customerName = `"${(p.reservation?.customer?.fullName || '').replace(/"/g, '""')}"`;
      const venue = `"${(p.reservation?.venue || '').replace(/"/g, '""')}"`;
      const refNo = `"${(p.referenceNo || '').replace(/"/g, '""')}"`;
      const recordedBy = `"${(p.recordedBy?.name || '').replace(/"/g, '""')}"`;

      csv += `${p._id},${dateStr},${customerName},${p.reservation?.eventType || ''},${venue},${p.method},${refNo},${p.amount},${recordedBy}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="payments-report.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReservationSummaryReport,
  getPaymentSummaryReport,
  getScheduleSummaryReport,
  exportReservationsCSV,
  exportPaymentsCSV
};
