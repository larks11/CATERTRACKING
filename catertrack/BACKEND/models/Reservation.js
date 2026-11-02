const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer reference is required']
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
      enum: {
        values: ['birthday', 'wedding', 'meeting', 'other'],
        message: '{VALUE} is not a valid event type'
      }
    },
    eventDate: {
      type: Date,
      required: [true, 'Event date is required']
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please provide a valid time in HH:mm 24-hour format']
    },
    venue: {
      type: String,
      required: [true, 'Venue location is required'],
      trim: true,
      maxlength: [200, 'Venue cannot exceed 200 characters']
    },
    guestCount: {
      type: Number,
      required: [true, 'Guest count is required'],
      min: [1, 'Guest count must be at least 1']
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: [true, 'Package reference is required']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
        message: '{VALUE} is not a valid reservation status'
      },
      default: 'Pending'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user is required']
    }
  },
  {
    timestamps: true
  }
);

// Helpful indexes for schedule queries, filtering by date and status
reservationSchema.index({ eventDate: 1, status: 1 });
reservationSchema.index({ customer: 1 });
reservationSchema.index({ eventDate: 1, startTime: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);
module.exports = Reservation;
