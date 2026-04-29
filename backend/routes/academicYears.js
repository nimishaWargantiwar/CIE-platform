// ==========================================
// Academic Year Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/academicYearController');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, roleCheck('admin'), validate('academicYear'), ctrl.create);
router.put('/:id', auth, roleCheck('admin'), ctrl.update);
router.delete('/:id', auth, roleCheck('admin'), ctrl.remove);

module.exports = router;
