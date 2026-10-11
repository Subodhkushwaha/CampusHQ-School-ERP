const permit = (...allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.admin?.role || 'owner';

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
