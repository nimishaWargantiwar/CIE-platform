// ==========================================
// Learning Routes — shared for admin/faculty
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/learningController');

router.get('/guides', auth, ctrl.getGuides);
router.get('/guides/:activityType', auth, ctrl.getGuideByActivityType);
router.post('/guides/view', auth, ctrl.markGuideView);

module.exports = router;
