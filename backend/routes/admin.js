// ==========================================
// Admin Routes — Validated
// ==========================================

const router = require('express').Router();
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/adminController');

// All admin routes require admin role
router.use(auth, roleCheck('admin'));

// User management
router.get('/users', ctrl.getUsers);
router.put('/users/:id', validate('adminUserUpdate'), ctrl.updateUser);
router.delete('/users/:id', validate('adminUserDelete'), ctrl.deleteUser);
router.get('/faculty', ctrl.getFaculty);

// Activity templates
router.get('/templates', ctrl.getTemplates);
router.post('/templates', validate('templateCreate'), ctrl.createTemplate);
router.put('/templates/:id', validate('templateUpdate'), ctrl.updateTemplate);
router.delete('/templates/:id', ctrl.deleteTemplate);

// Dashboard
router.get('/stats', ctrl.getStats);
router.get('/all-activities', ctrl.getAllActivities);

// System & Audit
router.get('/system-status', ctrl.getSystemStatus);
router.get('/audit-logs', ctrl.getAuditLogs);

module.exports = router;
