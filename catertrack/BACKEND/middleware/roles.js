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
        message: `Forbidden: role '${req.user.role}' cannot perform this action`
      });
    }

    next();
  };
};

const checkPaymentPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  const allowed = req.user.role === 'admin' || req.user.canRecordPayments === true;
  if (!allowed) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to record payments'
    });
  }

  next();
};

module.exports = {
  authorize,
  checkPaymentPermission
};
