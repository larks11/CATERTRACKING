const Reservation = require('../models/Reservation');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const { computePaymentSummary } = require('../utils/pricing');

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Upcoming events count (eventDate >= today and status != 'Cancelled')
    const upcomingEventsCount = await Reservation.countDocuments({
      eventDate: { $gte: today },
      status: { $in: ['Confirmed', 'Pending'] }
    });

    // 2. Pending reservations count
    const pendingReservationsCount = await Reservation.countDocuments({
      status: 'Pending'
    });

    // 3. Tasks in progress count
    const inProgressTasksCount = await Task.countDocuments({
      status: 'In Progress'
    });

    // 4. Calculate total unpaid balance across active reservations
    const activeReservations = await Reservation.find({
      status: { $in: ['Confirmed', 'Pending'] }
    });

    const activeResIds = activeReservations.map((r) => r._id);
    const payments = await Payment.find({ reservation: { $in: activeResIds } });

    let totalUnpaidBalance = 0;
    activeReservations.forEach((reservation) => {
      const relatedPayments = payments.filter(
        (p) => p.reservation.toString() === reservation._id.toString()
      );
      const summary = computePaymentSummary(reservation.totalAmount, relatedPayments);
      totalUnpaidBalance += summary.balance;
    });

    // 5. Next 5 upcoming events for immediate glance
    const upcomingEventsList = await Reservation.find({
      eventDate: { $gte: today },
      status: { $ne: 'Cancelled' }
    })
      .populate('customer', 'fullName contactNumber')
      .populate('package', 'name price')
      .sort({ eventDate: 1, startTime: 1 })
      .limit(5);

    // 6. Monthly revenue & reservation count for the current year (Chart.js data)
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const monthlyPayments = await Payment.aggregate([
      {
        $match: {
          paymentDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: { $month: '$paymentDate' },
          total: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyReservations = await Reservation.aggregate([
      {
        $match: {
          eventDate: { $gte: startOfYear, $lte: endOfYear },
          status: { $ne: 'Cancelled' }
        }
      },
      {
        $group: {
          _id: { $month: '$eventDate' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Map 1-12 months
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    const chartData = {
      labels: monthNames,
      revenueData: new Array(12).fill(0),
      reservationCountData: new Array(12).fill(0)
    };

    monthlyPayments.forEach((item) => {
      const monthIdx = item._id - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        chartData.revenueData[monthIdx] = item.total;
      }
    });

    monthlyReservations.forEach((item) => {
      const monthIdx = item._id - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        chartData.reservationCountData[monthIdx] = item.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        cards: {
          upcomingEvents: upcomingEventsCount,
          pendingReservations: pendingReservationsCount,
          unpaidBalance: Math.round(totalUnpaidBalance * 100) / 100,
          inProgressTasks: inProgressTasksCount
        },
        upcomingEventsList,
        chartData
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats
};
