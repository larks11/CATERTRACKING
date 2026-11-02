const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  login,
  logout,
  getMe,
  changePassword
} = require('../controllers/authController');

const { protect } = require('../middleware/auth');

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

router.post(
  '/login',
  validate([
    body('password').notEmpty().withMessage('Password is required'),
    body('username')
      .if(body('email').not().exists())
      .notEmpty()
      .withMessage('Username or email is required')
  ]),
  login
);

router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put(
  '/change-password',
  protect,
  validate([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ]),
  changePassword
);

module.exports = router;
