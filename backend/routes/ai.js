// ==========================================
// AI Routes — Rate-limited + Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/aiController');

// Generation endpoints (rate-limited + validated)
router.post('/generate-rubrics', auth, aiLimiter, validate('aiGenerateRubrics'), ctrl.generateRubrics);
router.post('/generate-guidelines', auth, aiLimiter, validate('aiGenerateGuidelines'), ctrl.generateGuidelines);
router.post('/student-feedback', auth, aiLimiter, validate('aiStudentFeedback'), ctrl.generateStudentFeedback);
router.post('/class-insights', auth, aiLimiter, validate('aiClassInsights'), ctrl.generateClassInsights);
router.post('/naac-report', auth, aiLimiter, validate('aiNAACReport'), ctrl.generateNAACReport);

// Read saved AI data
router.get('/feedback/:activityId', auth, ctrl.getFeedback);
router.get('/insights/:activityId', auth, ctrl.getInsights);
router.get('/report/:subjectId', auth, ctrl.getReport);

module.exports = router;
