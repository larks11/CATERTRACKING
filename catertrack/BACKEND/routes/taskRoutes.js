const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getTasks,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getReservationTaskProgress
} = require('../controllers/taskController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

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

router.get('/', getTasks);
router.get('/progress/:reservationId', getReservationTaskProgress);

router.post(
  '/',
  validate([
    body('reservation').isMongoId().withMessage('Valid reservation ID is required'),
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('dueDate').isISO8601().withMessage('Valid due date is required')
  ]),
  createTask
);

router.put('/:id', updateTask);

router.patch(
  '/:id/status',
  validate([
    body('status').isIn(['Pending', 'In Progress', 'Completed']).withMessage('Valid status is required')
  ]),
  updateTaskStatus
);

router.delete('/:id', deleteTask);

module.exports = router;
