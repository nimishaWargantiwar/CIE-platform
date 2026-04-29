// ==========================================
// AI Controller — All 5 AI features + Audit
// ==========================================

const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const Score = require('../models/Score');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const FinalSubjectResult = require('../models/FinalSubjectResult');
const AIFeedback = require('../models/AIFeedback');
const AIInsight = require('../models/AIInsight');
const AIReport = require('../models/AIReport');
const aiService = require('../services/aiService');
const { getRubricAverages, getScoreDistribution } = require('../services/scoringEngine');
const audit = require('../services/auditService');
const logger = require('../services/logger');

function normalizeAreaList(input) {
  if (Array.isArray(input)) {
    return input
      .map((item) => ({
        rubricName: `${item?.rubricName || ''}`.trim(),
        avgScore: Number(item?.avgScore),
        suggestion: `${item?.suggestion || ''}`.trim(),
      }))
      .filter((item) => item.rubricName && Number.isFinite(item.avgScore));
  }

  if (input && typeof input === 'object') {
    const one = {
      rubricName: `${input.rubricName || ''}`.trim(),
      avgScore: Number(input.avgScore),
      suggestion: `${input.suggestion || ''}`.trim(),
    };
    return one.rubricName && Number.isFinite(one.avgScore) ? [one] : [];
  }

  return [];
}

/** POST /api/ai/generate-rubrics */
exports.generateRubrics = async (req, res, next) => {
  try {
    const { activityType, topic } = req.body;
    if (!activityType || !topic) {
      return res.status(400).json({ success: false, message: 'activityType and topic are required.' });
    }
    const rubrics = await aiService.generateRubrics(activityType, topic);

    audit.log({
      req,
      action: 'AI_GENERATE_RUBRICS',
      entityType: 'System',
      entityId: null,
      description: `AI rubrics generated for ${activityType}: ${topic}`,
    });

    res.json({ success: true, rubrics });
  } catch (err) {
    next(err);
  }
};

/** POST /api/ai/generate-guidelines */
exports.generateGuidelines = async (req, res, next) => {
  try {
    const { activityType, topic } = req.body;
    if (!activityType || !topic) {
      return res.status(400).json({ success: false, message: 'activityType and topic are required.' });
    }
    const guidelines = await aiService.generateGuidelines(activityType, topic);

    audit.log({
      req,
      action: 'AI_GENERATE_GUIDELINES',
      entityType: 'System',
      entityId: null,
      description: `AI guidelines generated for ${activityType}: ${topic}`,
    });

    res.json({ success: true, guidelines });
  } catch (err) {
    next(err);
  }
};

/** POST /api/ai/student-feedback */
exports.generateStudentFeedback = async (req, res, next) => {
  try {
    const { activityId, studentId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const rubrics = await ActivityRubric.find({ activity: activityId }).sort('order');
    const scores = await Score.find({ activity: activityId, student: studentId });

    const rubricScores = rubrics.map((r) => {
      const scoreDoc = scores.find((s) => s.rubric.toString() === r._id.toString());
      return { rubricName: r.name, score: scoreDoc ? scoreDoc.score : 0 };
    });

    const feedback = await aiService.generateStudentFeedback(student.name, rubricScores);

    // Save to DB
    await AIFeedback.findOneAndUpdate(
      { activity: activityId, student: studentId },
      { feedback, generatedBy: req.user._id },
      { upsert: true, new: true }
    );

    audit.log({
      req,
      action: 'AI_GENERATE_FEEDBACK',
      entityType: 'Activity',
      entityId: activityId,
      description: `AI feedback generated for student ${student.name}`,
    });

    res.json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
};

/** POST /api/ai/class-insights */
exports.generateClassInsights = async (req, res, next) => {
  try {
    const { activityId } = req.body;
    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    const rubricAverages = await getRubricAverages(activityId);
    const result = await aiService.generateClassInsights(activity.name, rubricAverages);

    const weakAreas = normalizeAreaList(result.weakAreas);
    let strongAreas = normalizeAreaList(result.strongAreas);

    // Ensure strong areas are still available even if provider omits them.
    if (strongAreas.length === 0) {
      strongAreas = rubricAverages
        .filter((r) => Number(r.avgScore) >= 4)
        .map((r) => ({
          rubricName: r.rubricName,
          avgScore: Number(r.avgScore),
          suggestion: `Continue reinforcing this strong area: ${r.rubricName}.`,
        }));
    }

    // Save to DB
    await AIInsight.findOneAndUpdate(
      { activity: activityId },
      {
        subject: activity.subject,
        insights: result.insights,
        weakAreas,
        strongAreas,
        generatedBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    audit.log({
      req,
      action: 'AI_GENERATE_INSIGHTS',
      entityType: 'Activity',
      entityId: activityId,
      description: `AI class insights generated for activity ${activity.name}`,
    });

    res.json({
      success: true,
      insights: result.insights,
      weakAreas,
      strongAreas,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/ai/naac-report */
exports.generateNAACReport = async (req, res, next) => {
  try {
    const { subjectId, reportType } = req.body;

    const subject = await Subject.findById(subjectId)
      .populate('class', 'name')
      .populate('academicYear', 'name')
      .populate('faculty', 'name');
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const activities = await Activity.find({ subject: subjectId });
    const students = await Student.find({
      class: subject.class._id,
      academicYear: subject.academicYear._id,
    });
    const results = await FinalSubjectResult.find({ subject: subjectId });

    const avgFinal = results.length > 0
      ? (results.reduce((s, r) => s + r.finalOutOf15, 0) / results.length).toFixed(2)
      : '0.00';

    const distribution = await getScoreDistribution(subjectId);

    // Build activity detail
    const activityDetails = [];
    for (const act of activities) {
      const rubricCount = await ActivityRubric.countDocuments({ activity: act._id });
      activityDetails.push({
        name: act.name,
        activityType: act.activityType,
        totalMarks: act.totalMarks,
        rubricCount,
      });
    }

    const subjectData = {
      subjectName: subject.name,
      subjectCode: subject.code,
      facultyName: subject.faculty.name,
      className: subject.class.name,
      academicYear: subject.academicYear.name,
      activities: activityDetails,
      totalStudents: students.length,
      avgFinal,
      distribution,
    };

    const content = await aiService.generateNAACReport(subjectData);

    // Save report
    const report = await AIReport.findOneAndUpdate(
      { subject: subjectId, faculty: subject.faculty._id },
      {
        reportType: reportType || 'NAAC',
        content,
        rawContent: JSON.stringify(content),
      },
      { upsert: true, new: true }
    );

    audit.log({
      req,
      action: 'AI_GENERATE_REPORT',
      entityType: 'AIReport',
      entityId: subjectId,
      description: `${reportType || 'NAAC'} report generated for ${subject.name}`,
    });

    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

/** GET /api/ai/feedback/:activityId — Get all saved feedback for activity */
exports.getFeedback = async (req, res, next) => {
  try {
    const feedbacks = await AIFeedback.find({ activity: req.params.activityId })
      .populate('student', 'rollNo name');
    res.json({ success: true, feedbacks });
  } catch (err) {
    next(err);
  }
};

/** GET /api/ai/insights/:activityId */
exports.getInsights = async (req, res, next) => {
  try {
    const insight = await AIInsight.findOne({ activity: req.params.activityId });
    res.json({ success: true, insight: insight || null });
  } catch (err) {
    next(err);
  }
};

/** GET /api/ai/report/:subjectId */
exports.getReport = async (req, res, next) => {
  try {
    const report = await AIReport.findOne({ subject: req.params.subjectId })
      .populate('faculty', 'name');
    res.json({ success: true, report: report || null });
  } catch (err) {
    next(err);
  }
};
