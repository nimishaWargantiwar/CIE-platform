// ==========================================
// Activity Access Check Middleware
// ==========================================
// Verifies that the requesting faculty member owns the activity
// or is an admin. Prevents cross-faculty data tampering.

const Activity = require('../models/Activity');
const Subject = require('../models/Subject');

/**
 * Middleware factory that checks activity ownership.
 * Reads activity ID from the specified request parameter.
 * @param {string} paramName - req.params key containing the activity ID (default: 'id')
 * @param {string} source - 'params' or 'body' (default: 'params')
 * @param {string} field - field name when source is 'body' (default: 'activityId')
 */
function checkActivityAccess(paramName = 'id', source = 'params', field = 'activityId') {
  return async (req, res, next) => {
    try {
      // Admins bypass ownership check
      if (req.user.role === 'admin') return next();

      const activityId = source === 'params' ? req.params[paramName] : req.body[field];
      if (!activityId) {
        return res.status(400).json({ success: false, message: 'Activity ID is required.' });
      }

      const activity = await Activity.findById(activityId).lean();
      if (!activity) {
        return res.status(404).json({ success: false, message: 'Activity not found.' });
      }

      if (activity.faculty.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not own this activity.',
        });
      }

      // Attach to request for downstream use
      req.activity = activity;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware that checks subject ownership for faculty.
 * @param {string} paramName - req.params key containing the subject ID
 */
function checkSubjectAccess(paramName = 'subjectId') {
  return async (req, res, next) => {
    try {
      if (req.user.role === 'admin') return next();

      const subjectId = req.params[paramName] || req.body.subject || req.body.subjectId;
      if (!subjectId) {
        return res.status(400).json({ success: false, message: 'Subject ID is required.' });
      }

      const subject = await Subject.findById(subjectId).lean();
      if (!subject) {
        return res.status(404).json({ success: false, message: 'Subject not found.' });
      }

      if (subject.faculty.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this subject.',
        });
      }

      req.subject = subject;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { checkActivityAccess, checkSubjectAccess };
