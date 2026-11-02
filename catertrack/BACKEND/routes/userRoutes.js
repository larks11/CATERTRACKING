const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus
} = require('../controllers/userController');

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

// All user management routes require admin role
router.use(protect, authorize('admin'));

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post(
  '/',
  validate([
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'staff']).withMessage('Role must be admin or staff')
  ]),
  createUser
);
router.put('/:id', updateUser);
router.patch('/:id/toggle-status', toggleUserStatus);

module.exports = router;
