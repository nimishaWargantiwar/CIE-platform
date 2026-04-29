// ==========================================
// Rubric Controller — CRUD + Faculty Library + Safe Delete
// ==========================================

const ActivityRubric = require('../models/ActivityRubric');
const Activity = require('../models/Activity');
const Score = require('../models/Score');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const FacultyRubricLibrary = require('../models/FacultyRubricLibrary');
const audit = require('../services/auditService');
const { recomputeSubjectResults } = require('../services/scoringEngine');
const logger = require('../services/logger');

/** GET /api/rubrics/activity/:activityId */
exports.getByActivity = async (req, res, next) => {
  try {
    const rubrics = await ActivityRubric.find({ activity: req.params.activityId }).sort('order');
    res.json(rubrics);
  } catch (err) {
    next(err);
  }
};

/** POST /api/rubrics */
exports.create = async (req, res, next) => {
  try {
    const { activity: activityId, name, criteria, order } = req.body;

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });
    if (activity.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Rubrics can only be added to activities in draft status.' });
    }

    const count = await ActivityRubric.countDocuments({ activity: activityId });
    const rubric = await ActivityRubric.create({
      activity: activityId,
      name,
      criteria,
      order: order ?? count,
    });

    audit.log({
      req,
      action: 'RUBRIC_CREATE',
      entityType: 'ActivityRubric',
      entityId: rubric._id,
      description: `Rubric created: ${name} for activity ${activity.name}`,
    });

    res.status(201).json(rubric);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/rubrics/:id */
exports.update = async (req, res, next) => {
  try {
    const rubric = await ActivityRubric.findById(req.params.id);
    if (!rubric) return res.status(404).json({ success: false, message: 'Rubric not found.' });
    if (rubric.isLocked) {
      return res.status(400).json({ success: false, message: 'Rubric is locked.' });
    }

    const previousState = rubric.toObject();

    const updated = await ActivityRubric.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    audit.log({
      req,
      action: 'RUBRIC_UPDATE',
      entityType: 'ActivityRubric',
      entityId: rubric._id,
      description: `Rubric updated: ${rubric.name}`,
      previousValue: previousState,
      newValue: updated.toObject(),
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/rubrics/:id — Safe delete with score check */
exports.remove = async (req, res, next) => {
  try {
    const rubric = await ActivityRubric.findById(req.params.id);
    if (!rubric) return res.status(404).json({ success: false, message: 'Rubric not found.' });
    if (rubric.isLocked) {
      return res.status(400).json({ success: false, message: 'Cannot delete a locked rubric.' });
    }

    // Check for existing scores referencing this rubric
    const scoreCount = await Score.countDocuments({ rubric: rubric._id });
    if (scoreCount > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        success: false,
        message: `${scoreCount} scores exist for this rubric. Add ?force=true to confirm deletion.`,
        scoreCount,
      });
    }

    // Delete scores referencing this rubric
    if (scoreCount > 0) {
      await Score.deleteMany({ rubric: rubric._id });
      logger.info('Scores deleted during rubric removal', {
        rubricId: rubric._id,
        scoreCount,
      });
    }

    await ActivityRubric.findByIdAndDelete(req.params.id);

    // Recompute subject results since rubric removed affects scoring
    if (scoreCount > 0) {
      const activity = await Activity.findById(rubric.activity);
      if (activity) {
        const subject = await Subject.findById(activity.subject);
        if (subject) {
          const students = await Student.find({
            class: subject.class,
            academicYear: subject.academicYear,
          });
          await recomputeSubjectResults(subject._id, students.map((s) => s._id));
        }
      }
    }

    audit.log({
      req,
      action: 'RUBRIC_DELETE',
      entityType: 'ActivityRubric',
      entityId: req.params.id,
      description: `Rubric deleted: ${rubric.name} (${scoreCount} scores cleaned)`,
    });

    res.json({ success: true, message: 'Rubric deleted.', scoresRemoved: scoreCount });
  } catch (err) {
    next(err);
  }
};

// ---- Faculty Rubric Library ----

/** GET /api/rubrics/library */
exports.getLibrary = async (req, res, next) => {
  try {
    const filter = { faculty: req.user._id };
    if (req.query.activityType) filter.activityType = req.query.activityType;

    const rubrics = await FacultyRubricLibrary.find(filter).sort('-createdAt');
    res.json(rubrics);
  } catch (err) {
    next(err);
  }
};

/** POST /api/rubrics/library — Save rubric to library */
exports.saveToLibrary = async (req, res, next) => {
  try {
    const { activityType, name, criteria } = req.body;
    const rubric = await FacultyRubricLibrary.create({
      faculty: req.user._id,
      activityType,
      name,
      criteria,
    });
    res.status(201).json(rubric);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/rubrics/library/:id */
exports.removeFromLibrary = async (req, res, next) => {
  try {
    const rubric = await FacultyRubricLibrary.findOneAndDelete({
      _id: req.params.id,
      faculty: req.user._id,
    });
    if (!rubric) return res.status(404).json({ success: false, message: 'Library rubric not found.' });
    res.json({ success: true, message: 'Removed from library.' });
  } catch (err) {
    next(err);
  }
};

/** POST /api/rubrics/library/:id/apply — Apply library rubric to activity */
exports.applyFromLibrary = async (req, res, next) => {
  try {
    const { activityId } = req.body;
    const libRubric = await FacultyRubricLibrary.findById(req.params.id);
    if (!libRubric) return res.status(404).json({ success: false, message: 'Library rubric not found.' });

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });
    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked.' });
    }

    const count = await ActivityRubric.countDocuments({ activity: activityId });
    const rubric = await ActivityRubric.create({
      activity: activityId,
      name: libRubric.name,
      criteria: libRubric.criteria,
      order: count,
    });
    res.status(201).json(rubric);
  } catch (err) {
    next(err);
  }
};
