// ==========================================
// Rate Limiter — Especially for AI endpoints
// ==========================================

const rateLimit = require('express-rate-limit');
const { AI_RATE_LIMIT_WINDOW_MS, AI_RATE_LIMIT_MAX } = require('../config/env');

/** General API rate limiter */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Stricter limiter for AI endpoints */
const aiLimiter = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  max: AI_RATE_LIMIT_MAX,
  message: { message: 'AI rate limit exceeded. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Public quiz read limiter (token + IP scoped) */
const quizAttemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => `${req.ip}:${req.params.token || 'unknown'}`,
  message: { message: 'Too many quiz requests. Please wait a moment and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Public quiz submission limiter (stricter, token + IP scoped) */
const quizSubmitLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `${req.ip}:${req.params.token || 'unknown'}:submit`,
  message: { message: 'Too many submission attempts. Please wait and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  aiLimiter,
  quizAttemptLimiter,
  quizSubmitLimiter,
};
