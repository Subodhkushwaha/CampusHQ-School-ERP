const permit = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Authorization credentials missing.',
      });
    }

    const userRole = req.admin.role || 'staff';

    // 'owner' (Super Admin) always has full bypass access
    if (userRole === 'owner') {
      return next();
    }

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Role '${userRole}' is not authorized to access this resource.`,
    });
  };
};

module.exports = { permit };
