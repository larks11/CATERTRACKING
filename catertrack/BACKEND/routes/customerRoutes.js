const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
} = require('../controllers/customerController');

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

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post(
  '/',
  validate([
    body('fullName').trim().notEmpty().withMessage('Customer full name is required'),
    body('contactNumber').trim().notEmpty().withMessage('Contact number is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Please provide a valid email'),
    body('address').trim().notEmpty().withMessage('Address is required')
  ]),
  createCustomer
);
router.put(
  '/:id',
  validate([
    body('fullName').optional().trim().notEmpty().withMessage('Customer full name cannot be empty'),
    body('contactNumber').optional().trim().notEmpty().withMessage('Contact number cannot be empty')
  ]),
  updateCustomer
);
router.delete('/:id', authorize('admin'), deleteCustomer);

module.exports = router;
