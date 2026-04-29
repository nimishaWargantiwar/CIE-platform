// ==========================================
// Onboarding Routes — Faculty progress
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/onboardingController');

router.get('/faculty/progress', auth, ctrl.getFacultyProgress);
router.get('/faculty/leaderboard', auth, ctrl.getFacultyLeaderboard);

module.exports = router;
