const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

const {
  getPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage
} = require('../controllers/packageController');

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

router.get('/', getPackages);
router.get('/:id', getPackageById);

// Modifying packages is restricted to Admin
router.post(
  '/',
  authorize('admin'),
  validate([
    body('name').trim().notEmpty().withMessage('Package name is required'),
    body('pricingType').isIn(['per_head', 'fixed']).withMessage('Pricing type must be per_head or fixed'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ]),
  createPackage
);

router.put(
  '/:id',
  authorize('admin'),
  validate([
    body('pricingType').optional().isIn(['per_head', 'fixed']).withMessage('Pricing type must be per_head or fixed'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number')
  ]),
  updatePackage
);

router.delete('/:id', authorize('admin'), deletePackage);

module.exports = router;
