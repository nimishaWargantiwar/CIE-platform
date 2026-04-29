// ==========================================
// Role-Based Access Control Middleware
// ==========================================

/**
 * Factory function that returns middleware for role checking
 * @param  {...string} roles - Allowed roles (e.g., 'admin', 'faculty')
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }
    next();
  };
};

module.exports = roleCheck;
