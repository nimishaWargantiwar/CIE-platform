// ==========================================
// Score Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { checkSubjectAccess } = require('../middleware/activityAccess');
const ctrl = require('../controllers/scoreController');

router.get('/activity/:activityId', auth, ctrl.getActivityScores);
router.post('/bulk', auth, validate('scoreBulk'), ctrl.saveBulk);
router.get('/subject/:subjectId/final', auth, ctrl.getSubjectFinalResults);
router.post('/subject/:subjectId/recompute', auth, ctrl.recompute);

module.exports = router;
