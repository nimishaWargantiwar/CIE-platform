// ==========================================
// Score Controller — Grade students per rubric
// ==========================================

const Score = require('../models/Score');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const FinalSubjectResult = require('../models/FinalSubjectResult');
const { calculateActivityScore, recomputeSubjectResults } = require('../services/scoringEngine');
const audit = require('../services/auditService');
const logger = require('../services/logger');

/** GET /api/scores/activity/:activityId — Full grading grid data */
exports.getActivityScores = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId).populate('subject');
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    const rubrics = await ActivityRubric.find({ activity: activity._id }).sort('order');
    const students = await Student.find({
      class: activity.subject.class,
      academicYear: activity.subject.academicYear,
    }).sort('rollNo');

    const scores = await Score.find({ activity: activity._id });

    // Build score matrix: { studentId: { rubricId: score } }
    const scoreMap = {};
    for (const s of scores) {
      if (!scoreMap[s.student.toString()]) scoreMap[s.student.toString()] = {};
      scoreMap[s.student.toString()][s.rubric.toString()] = s.score;
    }

    // Compute activity score per student
    const grid = students.map((student) => {
      const studentScores = scoreMap[student._id.toString()] || {};
      const rubricScores = rubrics.map((r) => ({
        rubricId: r._id,
        rubricName: r.name,
        score: studentScores[r._id.toString()] || null,
      }));

      const filledScores = rubricScores.filter((rs) => rs.score !== null);
      const sum = filledScores.reduce((acc, rs) => acc + rs.score, 0);
      const maxPossible = rubrics.length * 5;
      const activityScore = maxPossible > 0
        ? Math.round(((sum / maxPossible) * activity.totalMarks) * 100) / 100
        : 0;

      return {
        student: { _id: student._id, rollNo: student.rollNo, name: student.name },
        rubricScores,
        activityScore,
      };
    });

    res.json({ success: true, activity, rubrics, grid });
  } catch (err) {
    next(err);
  }
};

/** POST /api/scores/bulk — Save/update scores in bulk */
exports.saveBulk = async (req, res, next) => {
  try {
    const { activityId, scores } = req.body;
    // scores: [{ studentId, rubricId, score }]

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked. Cannot edit scores.' });
    }

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const ops = scores.map((s) => ({
      updateOne: {
        filter: { activity: activityId, student: s.studentId, rubric: s.rubricId },
        update: {
          $set: {
            score: s.score,
            gradedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    const result = await Score.bulkWrite(ops);

    // Recompute subject final results
    const subject = await Subject.findById(activity.subject);
    const studentIds = [...new Set(scores.map((s) => s.studentId))];
    await recomputeSubjectResults(subject._id, studentIds);

    audit.log({
      req,
      action: 'SCORES_BULK_SAVE',
      entityType: 'Score',
      entityId: activityId,
      description: `Bulk scores saved: ${scores.length} entries for activity ${activity.name}`,
    });

    res.json({
      success: true,
      message: `Saved ${result.modifiedCount + result.upsertedCount} scores.`,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/scores/subject/:subjectId/final — Get final results */
exports.getSubjectFinalResults = async (req, res, next) => {
  try {
    const results = await FinalSubjectResult.find({ subject: req.params.subjectId })
      .populate('student', 'rollNo name')
      .sort('student.rollNo');
    res.json({ success: true, results });
  } catch (err) {
    next(err);
  }
};

/** POST /api/scores/subject/:subjectId/recompute — Force recompute */
exports.recompute = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const students = await Student.find({
      class: subject.class,
      academicYear: subject.academicYear,
    });
    const studentIds = students.map((s) => s._id);
    const results = await recomputeSubjectResults(subject._id, studentIds);

    audit.log({
      req,
      action: 'SCORES_RECOMPUTE',
      entityType: 'FinalSubjectResult',
      entityId: subject._id,
      description: `Subject results recomputed for ${students.length} students`,
    });

    res.json({
      success: true,
      message: `Recomputed ${results.length} results.`,
      count: results.length,
    });
  } catch (err) {
    next(err);
  }
};
