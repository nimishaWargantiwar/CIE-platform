// ==========================================
// Activity Controller — CRUD + Lock/Unlock + Audit
// ==========================================

const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const ActivityTemplate = require('../models/ActivityTemplate');
const Subject = require('../models/Subject');
const Score = require('../models/Score');
const Student = require('../models/Student');
const audit = require('../services/auditService');
const { recomputeSubjectResults } = require('../services/scoringEngine');
const logger = require('../services/logger');
const DEFAULT_RUBRICS = require('../config/defaultRubrics');

const SEMESTER_TOTAL_CIE_MARKS = 15;

function roundMarks(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function escapeRegex(value) {
  return `${value || ''}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeActivityTitle(value) {
  return `${value || ''}`.trim().replace(/\s+/g, ' ');
}

async function findDuplicateActivityTitle(name, facultyId, excludeActivityId = null) {
  const normalized = normalizeActivityTitle(name);
  if (!normalized) return null;

  const filter = {
    faculty: facultyId,
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}$`, 'i') },
  };

  if (excludeActivityId) {
    filter._id = { $ne: excludeActivityId };
  }

  return Activity.findOne(filter).select('_id name').lean();
}

async function suggestNextActivityTitle(name, facultyId, excludeActivityId = null) {
  const normalized = normalizeActivityTitle(name) || 'CIE';
  const filter = {
    faculty: facultyId,
    name: { $regex: new RegExp(`^${escapeRegex(normalized)}(?:\\s+(\\d+))?$`, 'i') },
  };

  if (excludeActivityId) {
    filter._id = { $ne: excludeActivityId };
  }

  const existing = await Activity.find(filter).select('name').lean();
  let maxSuffix = 1;

  existing.forEach((row) => {
    const candidate = normalizeActivityTitle(row?.name);
    const match = candidate.match(new RegExp(`^${escapeRegex(normalized)}(?:\\s+(\\d+))?$`, 'i'));
    if (!match) return;
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > maxSuffix) {
      maxSuffix = parsed;
    }
  });

  return `${normalized} ${maxSuffix + 1}`;
}

function getSubjectCodeBase(subjectName) {
  const sanitized = `${subjectName || ''}`.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return (sanitized || 'SUBJ').slice(0, 12);
}

async function generateUniqueSubjectCode(subjectName, classId, academicYearId) {
  const base = getSubjectCodeBase(subjectName);
  const existing = await Subject.find({
    class: classId,
    academicYear: academicYearId,
    code: { $regex: new RegExp(`^${escapeRegex(base)}\\d*$`, 'i') },
  }).select('code').lean();

  const existingSet = new Set(existing.map((row) => `${row.code || ''}`.toUpperCase()));
  if (!existingSet.has(base)) return base;

  let counter = 2;
  while (counter < 1000) {
    const candidate = `${base}${counter}`.slice(0, 20);
    if (!existingSet.has(candidate)) return candidate;
    counter += 1;
  }

  return `${base}${Date.now().toString().slice(-4)}`.slice(0, 20);
}

async function getSubjectMarksSummary(subjectId, excludeActivityId = null) {
  const match = { subject: subjectId };
  if (excludeActivityId) {
    match._id = { $ne: excludeActivityId };
  }

  const [summary] = await Activity.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalMarks: { $sum: '$totalMarks' },
        activityCount: { $sum: 1 },
      },
    },
  ]);

  return {
    totalMarks: roundMarks(summary?.totalMarks || 0),
    activityCount: Number(summary?.activityCount || 0),
  };
}

/** GET /api/activities */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = req.query.subject;

    // Faculty only sees own activities
    if (req.user.role === 'faculty') {
      filter.faculty = req.user._id;
    }

    const activities = await Activity.find(filter)
      .populate({
        path: 'subject',
        select: 'name code class academicYear',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'academicYear', select: 'name' },
        ],
      })
      .populate('faculty', 'name email')
      .sort('-createdAt');
    res.json(activities);
  } catch (err) {
    next(err);
  }
};

/** GET /api/activities/:id */
exports.getById = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate({
        path: 'subject',
        select: 'name code class academicYear',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'academicYear', select: 'name' },
        ],
      })
      .populate('faculty', 'name email');
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const rubrics = await ActivityRubric.find({ activity: activity._id }).sort('order');
    res.json({ activity, rubrics });
  } catch (err) {
    next(err);
  }
};

/** POST /api/activities */
exports.create = async (req, res, next) => {
  try {
    const { name, activityType, subjectName, classId, academicYearId, totalMarks, topic, guidelines, videoUrl } = req.body;
    const normalizedName = normalizeActivityTitle(name);

    const existingByTitle = await findDuplicateActivityTitle(normalizedName, req.user._id);
    if (existingByTitle) {
      const suggestedName = await suggestNextActivityTitle(normalizedName, req.user._id);
      return res.status(409).json({
        success: false,
        code: 'ACTIVITY_NAME_DUPLICATE',
        message: `An activity titled "${normalizedName}" already exists. Please use a different title.`,
        suggestedName,
      });
    }

    // Find or create subject by name for this faculty/class/year
    const subjectFilter = {
      name: { $regex: new RegExp(`^${subjectName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      class: classId,
      academicYear: academicYearId,
    };

    // Keep faculty ownership consistent so dashboard subject/activity lists stay in sync.
    if (req.user.role === 'faculty') {
      subjectFilter.faculty = req.user._id;
    }

    let subjectDoc = await Subject.findOne(subjectFilter);

    if (!subjectDoc) {
      // Auto-create subject with a generated unique code for this class+academicYear.
      const code = await generateUniqueSubjectCode(subjectName, classId, academicYearId);
      subjectDoc = await Subject.create({
        name: subjectName,
        code,
        class: classId,
        academicYear: academicYearId,
        faculty: req.user._id,
      });
    }

    const requestedMarks = roundMarks(totalMarks);
    const existingSummary = await getSubjectMarksSummary(subjectDoc._id);
    const allowedRemaining = roundMarks(Math.max(SEMESTER_TOTAL_CIE_MARKS - existingSummary.totalMarks, 0));

    if (requestedMarks > allowedRemaining + 1e-9) {
      return res.status(400).json({
        success: false,
        message: `This subject already has ${existingSummary.totalMarks}/15 CIE marks. You can add up to ${allowedRemaining} more marks in this semester.`,
        limit: SEMESTER_TOTAL_CIE_MARKS,
        existingTotal: existingSummary.totalMarks,
        requestedMarks,
        remainingAllowed: allowedRemaining,
      });
    }

    // Load template once to inherit defaults (rubrics + optional guide video)
    const template = await ActivityTemplate.findOne({ activityType });
    const inheritedVideoUrl = `${template?.learningGuide?.videoUrl || ''}`.trim();
    const resolvedVideoUrl = `${videoUrl || ''}`.trim() || inheritedVideoUrl;

    const activity = await Activity.create({
      name: normalizedName,
      activityType,
      subject: subjectDoc._id,
      faculty: req.user._id,
      totalMarks,
      topic,
      guidelines,
      videoUrl: resolvedVideoUrl,
    });

    // Auto-copy rubrics from template or use built-in defaults
    let rubricSource = template?.defaultRubrics;

    // Fallback to built-in default rubrics if no template exists
    if (!rubricSource || rubricSource.length === 0) {
      rubricSource = DEFAULT_RUBRICS[activityType] || DEFAULT_RUBRICS['Other'] || [];
    }

    if (rubricSource.length > 0) {
      const rubricDocs = rubricSource.map((r, idx) => ({
        activity: activity._id,
        name: r.name,
        criteria: r.criteria,
        order: idx,
      }));
      await ActivityRubric.insertMany(rubricDocs);
    }

    audit.log({
      req,
      action: 'ACTIVITY_CREATE',
      entityType: 'Activity',
      entityId: activity._id,
      description: `Activity created: ${normalizedName} (${activityType})`,
      newValue: { name: normalizedName, activityType, subject: subjectDoc._id, totalMarks },
    });

    res.status(201).json(activity);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/activities/:id */
exports.update = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked. Request unlock from admin.' });
    }

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const previousTotalMarks = activity.totalMarks;
    const previousState = activity.toObject();

    if (typeof req.body.name === 'string') {
      const normalizedName = normalizeActivityTitle(req.body.name);
      const duplicate = await findDuplicateActivityTitle(normalizedName, activity.faculty, activity._id);

      if (duplicate) {
        const suggestedName = await suggestNextActivityTitle(normalizedName, activity.faculty, activity._id);
        return res.status(409).json({
          success: false,
          code: 'ACTIVITY_NAME_DUPLICATE',
          message: `An activity titled "${normalizedName}" already exists. Please use a different title.`,
          suggestedName,
        });
      }

      req.body.name = normalizedName;
    }

    if (typeof req.body.totalMarks !== 'undefined') {
      const requestedMarks = roundMarks(req.body.totalMarks);
      if (Math.abs(requestedMarks - roundMarks(previousTotalMarks)) > 1e-9) {
        const existingSummary = await getSubjectMarksSummary(activity.subject, activity._id);
        const projectedTotal = roundMarks(existingSummary.totalMarks + requestedMarks);

        if (projectedTotal > SEMESTER_TOTAL_CIE_MARKS + 1e-9) {
          const allowedRemaining = roundMarks(Math.max(SEMESTER_TOTAL_CIE_MARKS - existingSummary.totalMarks, 0));
          return res.status(400).json({
            success: false,
            message: `Updating to ${requestedMarks} exceeds the 15-mark CIE semester cap. Maximum allowed for this activity is ${allowedRemaining}.`,
            limit: SEMESTER_TOTAL_CIE_MARKS,
            existingTotalExcludingCurrent: existingSummary.totalMarks,
            requestedMarks,
            maximumAllowedForThisActivity: allowedRemaining,
          });
        }
      }
    }

    const updated = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // If totalMarks changed, recalculate all subject results
    if (req.body.totalMarks && req.body.totalMarks !== previousTotalMarks) {
      logger.info('TotalMarks changed, triggering recomputation', {
        activityId: activity._id,
        old: previousTotalMarks,
        new: req.body.totalMarks,
      });
      const subject = await Subject.findById(activity.subject);
      if (subject) {
        const students = await Student.find({
          class: subject.class,
          academicYear: subject.academicYear,
        });
        await recomputeSubjectResults(subject._id, students.map((s) => s._id));
      }
    }

    audit.log({
      req,
      action: 'ACTIVITY_UPDATE',
      entityType: 'Activity',
      entityId: activity._id,
      description: `Activity updated: ${activity.name}`,
      previousValue: previousState,
      newValue: updated.toObject(),
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

/** POST /api/activities/:id/submit */
exports.submit = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    activity.status = 'submitted';
    activity.submittedAt = new Date();
    await activity.save();

    // Lock all rubrics
    await ActivityRubric.updateMany({ activity: activity._id }, { isLocked: true });

    audit.log({
      req,
      action: 'ACTIVITY_SUBMIT',
      entityType: 'Activity',
      entityId: activity._id,
      description: `Activity submitted: ${activity.name}`,
    });

    res.json({ success: true, message: 'Activity submitted and rubrics locked.', activity });
  } catch (err) {
    next(err);
  }
};

/** POST /api/activities/:id/lock */
exports.lock = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    // Faculty can only lock their own activities
    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only lock your own activities.' });
    }

    activity.status = 'locked';
    activity.lockedAt = new Date();
    await activity.save();

    await ActivityRubric.updateMany({ activity: activity._id }, { isLocked: true });

    audit.log({
      req,
      action: 'ACTIVITY_LOCK',
      entityType: 'Activity',
      entityId: activity._id,
      description: `Activity locked: ${activity.name}`,
    });

    res.json({ success: true, message: 'Activity locked.', activity });
  } catch (err) {
    next(err);
  }
};

/** POST /api/activities/:id/unlock */
exports.unlock = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    // Only admin or the owning faculty can unlock
    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only unlock your own activities.' });
    }

    activity.status = 'draft';
    activity.unlockedBy = req.user._id;
    activity.lockedAt = null;
    await activity.save();

    await ActivityRubric.updateMany({ activity: activity._id }, { isLocked: false });

    audit.log({
      req,
      action: 'ACTIVITY_UNLOCK',
      entityType: 'Activity',
      entityId: activity._id,
      description: `Activity unlocked by ${req.user.name}: ${activity.name}`,
    });

    res.json({ success: true, message: 'Activity unlocked.', activity });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/activities/:id */
exports.remove = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Cannot delete locked activity.' });
    }

    // Clean up all related data
    const scoreCount = await Score.countDocuments({ activity: activity._id });
    await Score.deleteMany({ activity: activity._id });
    await ActivityRubric.deleteMany({ activity: activity._id });
    await Activity.findByIdAndDelete(req.params.id);

    // Recompute subject results since we removed scores
    if (scoreCount > 0) {
      const subject = await Subject.findById(activity.subject);
      if (subject) {
        const students = await Student.find({
          class: subject.class,
          academicYear: subject.academicYear,
        });
        await recomputeSubjectResults(subject._id, students.map((s) => s._id));
      }
    }

    audit.log({
      req,
      action: 'ACTIVITY_DELETE',
      entityType: 'Activity',
      entityId: req.params.id,
      description: `Activity deleted: ${activity.name} (${scoreCount} scores cleaned)`,
    });

    res.json({ success: true, message: 'Activity, rubrics, and scores deleted.' });
  } catch (err) {
    next(err);
  }
};
