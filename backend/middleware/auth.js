// ==========================================
// JWT Authentication Middleware
// ==========================================
// Verifies Bearer token, loads user, checks active status.
// Supports both access tokens and refresh tokens.

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/env');
const logger = require('../services/logger');

/**
 * Primary auth middleware — validates access tokens.
 */
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid token or user deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh.',
        code: 'TOKEN_EXPIRED',
      });
    }
    logger.warn('Auth failure', { error: err.message, ip: req.ip });
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

/**
 * Validate a refresh token and return decoded payload.
 * Used by the auth controller's refresh endpoint.
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

module.exports = auth;
module.exports.verifyRefreshToken = verifyRefreshToken;
