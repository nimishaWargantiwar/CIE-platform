// ==========================================
// Export Routes
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const ctrl = require('../controllers/exportController');

router.get('/subject/:subjectId/excel', auth, ctrl.exportSubjectExcel);
router.get('/subject/:subjectId/report-pdf', auth, ctrl.exportReportPDF);
router.post('/activity/:activityId/report-pdf', auth, uploadImages.array('images', 8), ctrl.exportActivityPDF);

module.exports = router;
