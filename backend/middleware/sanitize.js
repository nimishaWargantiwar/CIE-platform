// ==========================================
// MongoDB Input Sanitization Middleware
// ==========================================
// Prevents NoSQL injection by stripping $ and . operators
// from request body, query, and params.
// Works as defense-in-depth alongside Zod validation.

/**
 * Recursively sanitize an object by removing keys starting with '$'
 * and replacing '.' in keys (MongoDB operator injection prevention).
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys starting with $ (MongoDB operators)
    if (key.startsWith('$')) continue;
    // Sanitize nested objects recursively
    const safeKey = key.replace(/\./g, '_');
    sanitized[safeKey] = typeof value === 'object' ? sanitizeObject(value) : value;
  }
  return sanitized;
}

/**
 * Express middleware to sanitize req.body, req.query, req.params
 * against MongoDB injection attempts.
 */
function mongoSanitize(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

module.exports = mongoSanitize;
