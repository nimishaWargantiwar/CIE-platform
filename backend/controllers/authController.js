// ==========================================
// Auth Controller — Login, Register, Profile, Token Refresh
// ==========================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  JWT_SECRET, JWT_EXPIRE,
  JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRE,
} = require('../config/env');
const logger = require('../services/logger');
const audit = require('../services/auditService');

/** Generate access token (short-lived) */
function generateAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
}

/** Generate refresh token (long-lived) */
function generateRefreshToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRE,
  });
}

/** Sanitized user payload */
function userPayload(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
  };
}

/** POST /api/auth/login */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('Login attempt with unknown email', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failed — wrong password', { email, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact admin.' });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    audit.log({
      req,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user._id,
      description: `User ${user.email} logged in`,
    });

    res.json({
      success: true,
      token,
      refreshToken,
      user: userPayload(user),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/refresh — Issue new access token */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (err) {
      logger.warn('Invalid refresh token', { error: err.message, ip: req.ip });
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated.' });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/register (admin only via middleware) */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, role, department });

    audit.log({
      req,
      action: 'USER_CREATE',
      entityType: 'User',
      entityId: user._id,
      description: `New user registered: ${email} (${role || 'faculty'})`,
      newValue: userPayload(user),
    });

    res.status(201).json({ success: true, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/me */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/auth/password */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    audit.log({
      req,
      action: 'PASSWORD_CHANGE',
      entityType: 'User',
      entityId: user._id,
      description: 'Password changed',
    });

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};
