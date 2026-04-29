// ==========================================
// Admin Controller — Users, Templates, Stats, System
// ==========================================

const mongoose = require('mongoose');
const User = require('../models/User');
const ActivityTemplate = require('../models/ActivityTemplate');
const Activity = require('../models/Activity');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const logger = require('../services/logger');
const audit = require('../services/auditService');

/** GET /api/admin/users — Paginated user list */
exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort('name').skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      users,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/users/:id */
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, role, department, isActive } = req.body;

    const previous = await User.findById(req.params.id).select('-password').lean();
    if (!previous) return res.status(404).json({ success: false, message: 'User not found.' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, department, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    audit.log({
      req,
      action: 'USER_UPDATE',
      entityType: 'User',
      entityId: user._id,
      description: `Admin updated user ${user.email}`,
      previousValue: previous,
      newValue: user.toObject(),
    });

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/users/:id */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the last admin user.' });
      }
    }

    await User.findByIdAndDelete(id);

    audit.log({
      req,
      action: 'USER_DELETE',
      entityType: 'User',
      entityId: user._id,
      description: `Admin deleted user ${user.email}`,
      previousValue: user.toObject(),
    });

    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/faculty — List faculty only */
exports.getFaculty = async (req, res, next) => {
  try {
    const faculty = await User.find({ role: 'faculty', isActive: true })
      .select('name email department')
      .sort('name');
    res.json(faculty);
  } catch (err) {
    next(err);
  }
};

// ---- Activity Templates ----

/** GET /api/admin/templates */
exports.getTemplates = async (req, res, next) => {
  try {
    const templates = await ActivityTemplate.find().sort({ guidePriority: 1, activityType: 1 });
    res.json(templates);
  } catch (err) {
    next(err);
  }
};

/** POST /api/admin/templates */
exports.createTemplate = async (req, res, next) => {
  try {
    const {
      activityType,
      description,
      defaultRubrics,
      guidelines,
      learningGuide,
      isGuidePublished,
      guidePriority,
    } = req.body;

    const now = new Date();
    const template = await ActivityTemplate.create({
      activityType,
      description,
      defaultRubrics,
      guidelines,
      learningGuide,
      isGuidePublished,
      guidePriority,
      guideLastUpdatedBy: req.user._id,
      guideLastUpdatedAt: now,
      createdBy: req.user._id,
    });

    audit.log({
      req,
      action: 'TEMPLATE_CREATE',
      entityType: 'ActivityTemplate',
      entityId: template._id,
      description: `Template created: ${activityType}`,
    });

    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/admin/templates/:id */
exports.updateTemplate = async (req, res, next) => {
  try {
    const previous = await ActivityTemplate.findById(req.params.id).lean();
    if (!previous) return res.status(404).json({ success: false, message: 'Template not found.' });

    const updatePayload = { ...req.body };
    const guideTouched = ['learningGuide', 'isGuidePublished', 'guidePriority', 'guidelines']
      .some((k) => Object.prototype.hasOwnProperty.call(req.body, k));

    if (guideTouched) {
      updatePayload.guideLastUpdatedBy = req.user._id;
      updatePayload.guideLastUpdatedAt = new Date();
    }

    const template = await ActivityTemplate.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });

    audit.log({
      req,
      action: 'TEMPLATE_UPDATE',
      entityType: 'ActivityTemplate',
      entityId: template._id,
      description: `Template updated: ${template.activityType}`,
      previousValue: previous,
      newValue: template.toObject(),
    });

    res.json(template);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/admin/templates/:id */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await ActivityTemplate.findByIdAndDelete(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });

    audit.log({
      req,
      action: 'TEMPLATE_DELETE',
      entityType: 'ActivityTemplate',
      entityId: req.params.id,
      description: `Template deleted: ${template.activityType}`,
    });

    res.json({ success: true, message: 'Template deleted.' });
  } catch (err) {
    next(err);
  }
};

// ---- Dashboard Stats ----

/** GET /api/admin/stats */
exports.getStats = async (req, res, next) => {
  try {
    const [
      totalFaculty,
      totalSubjects,
      totalStudents,
      totalActivities,
      activeYears,
      totalClasses,
    ] = await Promise.all([
      User.countDocuments({ role: 'faculty' }),
      Subject.countDocuments(),
      Student.countDocuments(),
      Activity.countDocuments(),
      AcademicYear.countDocuments({ isActive: true }),
      Class.countDocuments(),
    ]);

    const statusCounts = await Activity.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Department-wise breakdown
    const departmentStats = await User.aggregate([
      { $match: { role: 'faculty' } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      success: true,
      totalFaculty,
      totalSubjects,
      totalStudents,
      totalActivities,
      activeYears,
      totalClasses,
      activityStatus: statusCounts,
      departmentStats,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/admin/all-activities — Paginated activities (admin oversight) */
exports.getAllActivities = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.faculty) filter.faculty = req.query.faculty;

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('subject', 'name code')
        .populate('faculty', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Activity.countDocuments(filter),
    ]);

    res.json({
      success: true,
      activities,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    });
  } catch (err) {
    next(err);
  }
};

// ---- System Status ----

/** GET /api/admin/system-status — DB health, memory, collection stats */
exports.getSystemStatus = async (req, res, next) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    const mem = process.memoryUsage();
    const collectionCounts = await Promise.all([
      User.countDocuments(),
      Subject.countDocuments(),
      Activity.countDocuments(),
      Student.countDocuments(),
      Class.countDocuments(),
      AcademicYear.countDocuments(),
    ]);

    res.json({
      success: true,
      status: 'operational',
      database: {
        state: dbStates[dbState] || 'unknown',
        name: mongoose.connection.name,
      },
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      uptime: Math.round(process.uptime()),
      collections: {
        users: collectionCounts[0],
        subjects: collectionCounts[1],
        activities: collectionCounts[2],
        students: collectionCounts[3],
        classes: collectionCounts[4],
        academicYears: collectionCounts[5],
      },
      nodeVersion: process.version,
    });
  } catch (err) {
    next(err);
  }
};

// ---- Audit Logs ----

/** GET /api/admin/audit-logs — Query audit trail */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { action, entityType, entityId, userId, startDate, endDate, page, limit } = req.query;
    const result = await audit.query({
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      page: parseInt(page, 10) || 1,
      limit: Math.min(100, parseInt(limit, 10) || 50),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
