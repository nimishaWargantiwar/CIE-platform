// ==========================================
// Quiz Routes — Quiz module endpoints
// ==========================================
// Split into authenticated (faculty) and public (student) routes.
// Does NOT modify any existing route file.

const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { quizAttemptLimiter, quizSubmitLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/quizController');

// ---- Faculty Routes (Authenticated) ----

// Question management
router.get('/questions/:activityId', auth, ctrl.getQuestions);
router.post('/questions', auth, validate('quizQuestionCreate'), ctrl.addQuestion);
router.put('/questions/:questionId', auth, ctrl.updateQuestion);
router.delete('/questions/:questionId', auth, ctrl.deleteQuestion);
router.put('/questions/reorder/:activityId', auth, ctrl.reorderQuestions);

// Token / link management
router.post('/generate-link', auth, validate('quizGenerateLink'), ctrl.generateLink);
router.get('/tokens/:activityId', auth, ctrl.getTokens);
router.patch('/tokens/:tokenId/deactivate', auth, ctrl.deactivateToken);

// Results & submissions
router.get('/submissions/:activityId', auth, ctrl.getSubmissions);
router.get('/submissions/detail/:submissionId', auth, ctrl.getSubmissionDetail);
router.patch('/submissions/:submissionId/override', auth, validate('quizScoreOverride'), ctrl.overrideScore);

// CIE sync
router.post('/sync-cie/:activityId', auth, ctrl.syncToCIE);
router.post('/sync-cie/single/:submissionId', auth, ctrl.syncSingleToCIE);

// ---- Public Routes (Student — No Auth) ----

// Load quiz via token
router.get('/attempt/:token', quizAttemptLimiter, ctrl.loadQuiz);

// Submit quiz
router.post('/attempt/:token/submit', quizSubmitLimiter, validate('quizAttemptSubmit'), ctrl.submitQuiz);

module.exports = router;
