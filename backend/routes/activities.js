// ==========================================
// Activity Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/activityController');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, validate('activityCreate'), ctrl.create);
router.put('/:id', auth, validate('activityUpdate'), ctrl.update);
router.delete('/:id', auth, ctrl.remove);
router.post('/:id/submit', auth, ctrl.submit);
router.post('/:id/lock', auth, roleCheck('admin', 'faculty'), ctrl.lock);
router.post('/:id/unlock', auth, roleCheck('admin', 'faculty'), ctrl.unlock);

module.exports = router;
