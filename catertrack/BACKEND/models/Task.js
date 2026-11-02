const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    reservation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Reservation',
      required: [true, 'Reservation reference is required']
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters']
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required']
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'In Progress', 'Completed'],
        message: '{VALUE} is not a valid task status'
      },
      default: 'Pending'
    }
  },
  {
    timestamps: true
  }
);

taskSchema.index({ reservation: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
