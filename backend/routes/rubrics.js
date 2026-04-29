// ==========================================
// Rubric Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/rubricController');

// Activity rubrics
router.get('/activity/:activityId', auth, ctrl.getByActivity);
router.post('/', auth, validate('rubricCreate'), ctrl.create);
router.put('/:id', auth, validate('rubricUpdate'), ctrl.update);
router.delete('/:id', auth, ctrl.remove);

// Faculty rubric library
router.get('/library', auth, ctrl.getLibrary);
router.post('/library', auth, validate('libraryRubric'), ctrl.saveToLibrary);
router.delete('/library/:id', auth, ctrl.removeFromLibrary);
router.post('/library/:id/apply', auth, ctrl.applyFromLibrary);

module.exports = router;
