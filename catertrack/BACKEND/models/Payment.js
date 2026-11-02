const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation reference is required']
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0']
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      required: [true, 'Payment date is required']
    },
    method: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['cash', 'GCash', 'bank_transfer'],
        message: '{VALUE} is not a valid payment method'
      }
    },
    referenceNo: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference number cannot exceed 100 characters']
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who recorded payment is required']
    }
  },
  {
    timestamps: true
  }
);

paymentSchema.index({ reservation: 1, paymentDate: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;
