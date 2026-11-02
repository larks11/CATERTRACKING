const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
      unique: true,
      maxlength: [100, 'Package name cannot exceed 100 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    inclusions: {
      type: [String],
      default: []
    },
    pricingType: {
      type: String,
      required: [true, 'Pricing type is required'],
      enum: {
        values: ['per_head', 'fixed'],
        message: '{VALUE} is not a valid pricing type'
      },
      default: 'per_head'
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Package = mongoose.model('Package', packageSchema);
module.exports = Package;
