// ==========================================
// Student Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const upload = require('../middleware/upload');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/studentController');

router.get('/', auth, ctrl.getAll);
router.get('/:id', auth, ctrl.getById);
router.post('/', auth, roleCheck('admin'), validate('studentCreate'), ctrl.create);
router.put('/:id', auth, roleCheck('admin'), ctrl.update);
router.delete('/:id', auth, roleCheck('admin'), ctrl.remove);
router.post('/import', auth, roleCheck('admin'), upload.single('file'), validate('studentImport'), ctrl.importExcel);

module.exports = router;
