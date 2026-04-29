// ==========================================
// Auth Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/authController');

router.post('/login', validate('login'), ctrl.login);
router.post('/refresh', ctrl.refreshToken);
router.post('/register', auth, roleCheck('admin'), validate('register'), ctrl.register);
router.get('/me', auth, ctrl.getMe);
router.put('/password', auth, validate('changePassword'), ctrl.changePassword);

module.exports = router;
