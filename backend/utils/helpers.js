// ==========================================
// Utility Helpers
// ==========================================

/**
 * Wrap async route handlers to forward errors to Express error handler.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Build pagination meta from Mongoose query.
 * @param {number} total  - total document count
 * @param {number} page   - current page (1-based)
 * @param {number} limit  - items per page
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  pages: Math.ceil(total / limit),
  limit,
});

/**
 * Sanitise user input: trim strings in an object.
 */
const trimFields = (obj) => {
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    out[key] = typeof val === 'string' ? val.trim() : val;
  }
  return out;
};

module.exports = { asyncHandler, paginationMeta, trimFields };
