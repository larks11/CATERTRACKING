const Task = require('../models/Task');
const Reservation = require('../models/Reservation');

// Get tasks with optional reservationId or assignedTo filter
const getTasks = async (req, res, next) => {
  try {
    const { reservationId, status, assignedTo } = req.query;
    const filter = {};

    if (reservationId) filter.reservation = reservationId;
    if (status && ['Pending', 'In Progress', 'Completed'].includes(status)) filter.status = status;
    if (assignedTo) filter.assignedTo = assignedTo;

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name username email')
      .populate({
        path: 'reservation',
        select: 'eventType eventDate startTime venue status',
        populate: {
          path: 'customer',
          select: 'fullName contactNumber'
        }
      })
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

// Create task for a reservation
const createTask = async (req, res, next) => {
  try {
    const { reservation: reservationId, title, assignedTo, dueDate, status } = req.body;

    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Reservation not found'
      });
    }

    const task = await Task.create({
      reservation: reservationId,
      title,
      assignedTo: assignedTo || null,
      dueDate: new Date(dueDate),
      status: status || 'Pending'
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name username')
      .populate('reservation', 'eventType eventDate venue');

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (err) {
    next(err);
  }
};

// Update task details
const updateTask = async (req, res, next) => {
  try {
    const { title, assignedTo, dueDate, status } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (assignedTo !== undefined) updateFields.assignedTo = assignedTo || null;
    if (dueDate !== undefined) updateFields.dueDate = new Date(dueDate);
    if (status !== undefined) updateFields.status = status;

    const task = await Task.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    })
      .populate('assignedTo', 'name username')
      .populate('reservation', 'eventType eventDate venue');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

// Quick status update (accessible by staff)
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task status'
      });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name username')
      .populate('reservation', 'eventType eventDate venue');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

// Delete task
const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(task._id);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (err) {
    next(err);
  }
};

// Get progress stats for a reservation
const getReservationTaskProgress = async (req, res, next) => {
  try {
    const { reservationId } = req.params;

    const tasks = await Task.find({ reservation: reservationId });
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const inProgress = tasks.filter((t) => t.status === 'In Progress').length;
    const pending = tasks.filter((t) => t.status === 'Pending').length;

    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    res.status(200).json({
      success: true,
      data: {
        total,
        completed,
        inProgress,
        pending,
        percentage
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getReservationTaskProgress
};
