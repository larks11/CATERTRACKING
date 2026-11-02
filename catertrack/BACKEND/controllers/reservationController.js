const Reservation = require('../models/Reservation');
const Package = require('../models/Package');
const Payment = require('../models/Payment');
const Task = require('../models/Task');
const { calculateReservationTotal, computePaymentSummary } = require('../utils/pricing');

// Get all reservations with optional filters (status, date range, search)
const getReservations = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { status, startDate, endDate, search } = req.query;

    const filter = {};

    if (status && ['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.eventDate = {};
      if (startDate) {
        filter.eventDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.eventDate.$lte = end;
      }
    }

    let query = Reservation.find(filter)
      .populate('customer', 'fullName contactNumber email address')
      .populate('package', 'name price pricingType')
      .populate('createdBy', 'name username')
      .sort({ eventDate: 1, startTime: 1 });

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query = query.or([
        { venue: searchRegex },
        { eventType: searchRegex },
        { notes: searchRegex }
      ]);
    }

    const total = await Reservation.countDocuments(filter);
    const reservations = await query.skip(skip).limit(limit);

    // Attach payment balance summary to each reservation
    const reservationIds = reservations.map((r) => r._id);
    const payments = await Payment.find({ reservation: { $in: reservationIds } });

    const formattedData = reservations.map((resItem) => {
      const relatedPayments = payments.filter(
        (p) => p.reservation.toString() === resItem._id.toString()
      );
      const summary = computePaymentSummary(resItem.totalAmount, relatedPayments);
      return {
        ...resItem.toObject(),
        paymentSummary: summary
      };
    });

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      data: formattedData
    });
  } catch (err) {
    next(err);
  }
};

// Get single reservation by ID
const getReservationById = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('customer')
      .populate('package')
      .populate('createdBy', 'name username');

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const payments = await Payment.find({ reservation: reservation._id })
      .populate('recordedBy', 'name username')
      .sort({ paymentDate: -1 });

    const tasks = await Task.find({ reservation: reservation._id })
      .populate('assignedTo', 'name username')
      .sort({ dueDate: 1 });

    const paymentSummary = computePaymentSummary(reservation.totalAmount, payments);

    res.status(200).json({
      success: true,
      data: {
        ...reservation.toObject(),
        payments,
        tasks,
        paymentSummary
      }
    });
  } catch (err) {
    next(err);
  }
};

// Check for double booking warning
const checkDoubleBooking = async (req, res, next) => {
  try {
    const { eventDate, startTime, excludeId } = req.query;

    if (!eventDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'eventDate and startTime query parameters are required'
      });
    }

    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflictFilter = {
      eventDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: 'Confirmed'
    };

    if (excludeId) {
      conflictFilter._id = { $ne: excludeId };
    }

    const conflictingEvents = await Reservation.find(conflictFilter)
      .populate('customer', 'fullName contactNumber')
      .populate('package', 'name');

    res.status(200).json({
      success: true,
      hasConflict: conflictingEvents.length > 0,
      conflicts: conflictingEvents
    });
  } catch (err) {
    next(err);
  }
};

// Create new reservation
const createReservation = async (req, res, next) => {
  try {
    const {
      customer,
      eventType,
      eventDate,
      startTime,
      venue,
      guestCount,
      package: packageId,
      status,
      notes
    } = req.body;

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(400).json({
        success: false,
        message: 'Selected catering package does not exist'
      });
    }

    const totalAmount = calculateReservationTotal(pkg, guestCount);

    // Check potential double booking on same date and time
    const targetDate = new Date(eventDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const conflicting = await Reservation.find({
      eventDate: { $gte: startOfDay, $lte: endOfDay },
      startTime,
      status: 'Confirmed'
    });

    const reservation = await Reservation.create({
      customer,
      eventType,
      eventDate: targetDate,
      startTime,
      venue,
      guestCount: parseInt(guestCount, 10),
      package: packageId,
      totalAmount,
      status: status || 'Pending',
      notes,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: reservation,
      doubleBookingWarning:
        conflicting.length > 0
          ? `Warning: ${conflicting.length} confirmed event already scheduled at this date and time.`
          : null
    });
  } catch (err) {
    next(err);
  }
};

// Update existing reservation
const updateReservation = async (req, res, next) => {
  try {
    const {
      customer,
      eventType,
      eventDate,
      startTime,
      venue,
      guestCount,
      package: packageId,
      status,
      notes
    } = req.body;

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    let totalAmount = reservation.totalAmount;

    // Recalculate total if package or guest count changed
    if (packageId || guestCount) {
      const pkgToUse = packageId ? await Package.findById(packageId) : await Package.findById(reservation.package);
      if (!pkgToUse) {
        return res.status(400).json({
          success: false,
          message: 'Catering package not found'
        });
      }
      const count = guestCount ? parseInt(guestCount, 10) : reservation.guestCount;
      totalAmount = calculateReservationTotal(pkgToUse, count);
    }

    if (customer) reservation.customer = customer;
    if (eventType) reservation.eventType = eventType;
    if (eventDate) reservation.eventDate = new Date(eventDate);
    if (startTime) reservation.startTime = startTime;
    if (venue) reservation.venue = venue;
    if (guestCount) reservation.guestCount = parseInt(guestCount, 10);
    if (packageId) reservation.package = packageId;
    if (status) reservation.status = status;
    if (notes !== undefined) reservation.notes = notes;
    reservation.totalAmount = totalAmount;

    await reservation.save();

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

// Quick status change
const updateReservationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    res.status(200).json({
      success: true,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
};

// Delete reservation (Admin only)
const deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    // Cascade delete tasks and payments
    await Task.deleteMany({ reservation: reservation._id });
    await Payment.deleteMany({ reservation: reservation._id });
    await Reservation.findByIdAndDelete(reservation._id);

    res.status(200).json({
      success: true,
      message: 'Reservation and associated tasks/payments deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReservations,
  getReservationById,
  checkDoubleBooking,
  createReservation,
  updateReservation,
  updateReservationStatus,
  deleteReservation
};
