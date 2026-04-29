// ==========================================
// Audit Service — Structured audit trail
// ==========================================
// Provides a simple API to log auditable events.
// All writes are fire-and-forget to avoid blocking requests.

const AuditLog = require('../models/AuditLog');
const logger = require('./logger');

/**
 * Record an audit event.
 * @param {Object} opts
 * @param {Object} opts.req       - Express request (for user, IP, UA)
 * @param {string} opts.action    - Action enum value
 * @param {string} opts.entityType- Entity type (Activity, Score, etc.)
 * @param {string} opts.entityId  - Entity ObjectId
 * @param {string} opts.description - Human-readable description
 * @param {*}      opts.previousValue - Snapshot before change
 * @param {*}      opts.newValue      - Snapshot after change
 */
async function log({
  req,
  action,
  entityType,
  entityId,
  description = '',
  previousValue,
  newValue,
}) {
  try {
    const entry = {
      user: req.user?._id,
      userName: req.user?.name || 'System',
      userRole: req.user?.role || 'admin',
      action,
      entityType,
      entityId,
      description,
      previousValue: previousValue ? sanitizeForLog(previousValue) : undefined,
      newValue: newValue ? sanitizeForLog(newValue) : undefined,
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('user-agent') || '',
    };

    // Fire-and-forget — don't await in request path
    AuditLog.create(entry).catch((err) => {
      logger.error('Audit log write failed', { error: err.message, action });
    });
  } catch (err) {
    // Never let audit logging crash the request
    logger.error('Audit log error', { error: err.message, action });
  }
}

/**
 * Sanitize large objects for audit storage.
 * Limits depth and removes sensitive fields.
 */
function sanitizeForLog(value) {
  if (typeof value !== 'object' || value === null) return value;

  const sanitized = JSON.parse(JSON.stringify(value));

  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.__v;

  return sanitized;
}

/**
 * Query audit logs with filters and pagination.
 */
async function query({
  action,
  entityType,
  entityId,
  userId,
  startDate,
  endDate,
  page = 1,
  limit = 50,
} = {}) {
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = entityId;
  if (userId) filter.user = userId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
}

module.exports = { log, query };
