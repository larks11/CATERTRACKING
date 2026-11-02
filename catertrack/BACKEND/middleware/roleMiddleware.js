/**
 * Middleware to restrict access based on user role
 * @param  {...string} roles - Allowed roles ('admin', 'staff')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

/**
 * Middleware to verify permission to record payments
 * Admin always has permission; staff must have canRecordPayments === true
 */
const checkPaymentPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const isAllowed = req.user.role === 'admin' || req.user.canRecordPayments === true;

  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      message: 'Permission denied: You are not authorized to record or modify payments'
    });
  }

  next();
};

module.exports = {
  authorize,
  checkPaymentPermission
};
