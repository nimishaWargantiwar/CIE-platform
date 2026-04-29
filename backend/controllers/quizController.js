// ==========================================
// Quiz Controller — Full quiz lifecycle management
// ==========================================
// Handles: question CRUD, token generation, student attempt,
// auto-evaluation, results dashboard, and CIE sync.
// Does NOT modify any existing controller logic.

const QuizQuestion = require('../models/QuizQuestion');
const QuizAttemptToken = require('../models/QuizAttemptToken');
const QuizSubmission = require('../models/QuizSubmission');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const audit = require('../services/auditService');
const logger = require('../services/logger');
const {
  evaluateSubmission,
  syncSubmissionToCIE,
  syncAllSubmissionsToCIE,
} = require('../services/quizEvaluationEngine');

const escapeRegExp = (value = '') => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
const normalizeRollNo = (value = '') => value.trim().toUpperCase();

// ==========================================
// QUESTION MANAGEMENT (Faculty — Authenticated)
// ==========================================

/** GET /api/quiz/questions/:activityId — Get all questions for a quiz activity */
exports.getQuestions = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const questions = await QuizQuestion.find({ activity: req.params.activityId }).sort('order');
    const totalQuizMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    res.json({ success: true, questions, totalQuizMarks });
  } catch (err) {
    next(err);
  }
};

/** POST /api/quiz/questions — Add a question to a quiz */
exports.addQuestion = async (req, res, next) => {
  try {
    const { activityId, questionType, questionText, options, expectedAnswer, marks, allowPartialScoring } = req.body;

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked. Cannot add questions.' });
    }

    const count = await QuizQuestion.countDocuments({ activity: activityId });

    const question = await QuizQuestion.create({
      activity: activityId,
      questionType,
      questionText,
      options: questionType === 'mcq' ? options : [],
      expectedAnswer: questionType === 'short' ? expectedAnswer : '',
      marks,
      allowPartialScoring: allowPartialScoring || false,
      order: count,
    });

    audit.log({
      req,
      action: 'QUIZ_QUESTION_ADD',
      entityType: 'QuizQuestion',
      entityId: question._id,
      description: `Quiz question added to activity ${activity.name}: ${questionText.substring(0, 50)}...`,
    });

    res.status(201).json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/quiz/questions/:questionId — Update a question */
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    const activity = await Activity.findById(question.activity);
    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked.' });
    }

    const updated = await QuizQuestion.findByIdAndUpdate(req.params.questionId, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, question: updated });
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/quiz/questions/:questionId — Remove a question */
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await QuizQuestion.findById(req.params.questionId);
    if (!question) return res.status(404).json({ success: false, message: 'Question not found.' });

    const activity = await Activity.findById(question.activity);
    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked.' });
    }

    await QuizQuestion.findByIdAndDelete(req.params.questionId);

    audit.log({
      req,
      action: 'QUIZ_QUESTION_DELETE',
      entityType: 'QuizQuestion',
      entityId: req.params.questionId,
      description: `Quiz question deleted from activity ${activity.name}`,
    });

    res.json({ success: true, message: 'Question deleted.' });
  } catch (err) {
    next(err);
  }
};

/** PUT /api/quiz/questions/reorder/:activityId — Reorder questions */
exports.reorderQuestions = async (req, res, next) => {
  try {
    const { questionIds } = req.body; // Array of question IDs in desired order

    const activity = await Activity.findById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const ops = questionIds.map((id, idx) => ({
      updateOne: {
        filter: { _id: id, activity: req.params.activityId },
        update: { $set: { order: idx } },
      },
    }));

    await QuizQuestion.bulkWrite(ops);
    res.json({ success: true, message: 'Questions reordered.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// TOKEN / LINK MANAGEMENT (Faculty — Authenticated)
// ==========================================

/** POST /api/quiz/generate-link — Generate a quiz attempt link */
exports.generateLink = async (req, res, next) => {
  try {
    const { activityId, expiresInHours, maxAttempts, allowMultipleAttempts } = req.body;

    const activity = await Activity.findById(activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked. Cannot generate quiz links.' });
    }

    // Check if quiz has questions
    const questionCount = await QuizQuestion.countDocuments({ activity: activityId });
    if (questionCount === 0) {
      return res.status(400).json({ success: false, message: 'Add quiz questions before generating a link.' });
    }

    const token = QuizAttemptToken.generateToken();
    const expiresAt = expiresInHours
      ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
      : null;

    const attemptToken = await QuizAttemptToken.create({
      activity: activityId,
      token,
      expiresAt,
      maxAttempts: maxAttempts || 1,
      allowMultipleAttempts: allowMultipleAttempts || false,
      generatedBy: req.user._id,
    });

    // Build the link (frontend route)
    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const quizLink = `${baseUrl}/quiz/attempt/${token}`;

    audit.log({
      req,
      action: 'QUIZ_LINK_GENERATE',
      entityType: 'QuizAttemptToken',
      entityId: attemptToken._id,
      description: `Quiz link generated for activity ${activity.name}`,
    });

    res.status(201).json({
      success: true,
      quizLink,
      token: attemptToken.token,
      expiresAt: attemptToken.expiresAt,
      maxAttempts: attemptToken.maxAttempts,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/quiz/tokens/:activityId — Get all tokens for an activity */
exports.getTokens = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tokens = await QuizAttemptToken.find({ activity: req.params.activityId })
      .populate('generatedBy', 'name email')
      .sort('-createdAt');

    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const enriched = tokens.map((t) => ({
      ...t.toObject(),
      quizLink: `${baseUrl}/quiz/attempt/${t.token}`,
      isValid: t.isValid(),
    }));

    res.json({ success: true, tokens: enriched });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/quiz/tokens/:tokenId/deactivate — Deactivate a token */
exports.deactivateToken = async (req, res, next) => {
  try {
    const token = await QuizAttemptToken.findById(req.params.tokenId)
      .populate('activity', 'faculty name');
    if (!token) return res.status(404).json({ success: false, message: 'Token not found.' });

    if (!token.activity) {
      return res.status(404).json({ success: false, message: 'Activity not found for this token.' });
    }

    if (req.user.role === 'faculty' && token.activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    token.isActive = false;
    await token.save();

    audit.log({
      req,
      action: 'QUIZ_LINK_DEACTIVATE',
      entityType: 'QuizAttemptToken',
      entityId: token._id,
      description: `Quiz link deactivated for activity ${token.activity.name || token.activity._id}`,
    });

    res.json({ success: true, message: 'Token deactivated.' });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// STUDENT QUIZ ATTEMPT (Public — No Auth Required)
// ==========================================

/** GET /api/quiz/attempt/:token — Load quiz for student attempt */
exports.loadQuiz = async (req, res, next) => {
  try {
    const attemptToken = await QuizAttemptToken.findOne({ token: req.params.token });
    if (!attemptToken) {
      return res.status(404).json({ success: false, message: 'Invalid quiz link.' });
    }

    if (!attemptToken.isValid()) {
      return res.status(403).json({ success: false, message: 'This quiz link has expired or been deactivated.' });
    }

    const activity = await Activity.findById(attemptToken.activity)
      .populate('subject', 'name code');
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Quiz activity not found.' });
    }

    if (activity.status === 'locked') {
      return res.status(403).json({ success: false, message: 'This quiz is closed.' });
    }

    // Load questions WITHOUT correct answers (security: don't expose answers to students)
    const questions = await QuizQuestion.find({ activity: attemptToken.activity })
      .select('-expectedAnswer')
      .sort('order')
      .lean();

    // Strip isCorrect from MCQ options
    const safeQuestions = questions.map((q) => ({
      ...q,
      options: q.questionType === 'mcq'
        ? q.options.map((o) => ({ _id: o._id, label: o.label }))
        : [],
    }));

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    res.json({
      success: true,
      quiz: {
        activityName: activity.name,
        subjectName: activity.subject?.name || '',
        subjectCode: activity.subject?.code || '',
        totalMarks,
        questionCount: questions.length,
        allowMultipleAttempts: attemptToken.allowMultipleAttempts,
      },
      questions: safeQuestions,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/quiz/attempt/:token/submit — Student submits quiz answers */
exports.submitQuiz = async (req, res, next) => {
  let lockAcquired = false;
  let lockedTokenId = null;
  const normalizedRollNo = normalizeRollNo(req.body.rollNo || '');

  try {
    const { studentName, answers, attemptStartedAt } = req.body;

    const attemptToken = await QuizAttemptToken.findOne({ token: req.params.token });
    if (!attemptToken) {
      return res.status(404).json({ success: false, message: 'Invalid quiz link.' });
    }

    if (!attemptToken.isValid()) {
      return res.status(403).json({ success: false, message: 'This quiz link has expired or been deactivated.' });
    }

    const activity = await Activity.findById(attemptToken.activity).select('status');
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Quiz activity not found.' });
    }

    if (activity.status === 'locked') {
      return res.status(403).json({ success: false, message: 'This quiz is closed.' });
    }

    const lockedToken = await QuizAttemptToken.findOneAndUpdate(
      { _id: attemptToken._id, activeAttemptRollNos: { $ne: normalizedRollNo } },
      { $addToSet: { activeAttemptRollNos: normalizedRollNo } },
      { new: true }
    );

    if (!lockedToken) {
      return res.status(409).json({
        success: false,
        message: 'A submission is already in progress for this roll number. Please wait and try again.',
      });
    }

    lockAcquired = true;
    lockedTokenId = lockedToken._id;

    const normalizedRollNoRegex = new RegExp(`^${escapeRegExp(normalizedRollNo)}$`, 'i');
    const existingSubmissionCount = await QuizSubmission.countDocuments({
      activity: lockedToken.activity,
      rollNo: { $regex: normalizedRollNoRegex },
      token: lockedToken._id,
    });

    if (!lockedToken.allowMultipleAttempts && existingSubmissionCount >= 1) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted this quiz. Multiple attempts are not allowed.',
      });
    }

    if (lockedToken.maxAttempts > 0 && existingSubmissionCount >= lockedToken.maxAttempts) {
      return res.status(409).json({
        success: false,
        message: `Maximum attempts (${lockedToken.maxAttempts}) reached for this quiz.`,
      });
    }

    const questions = await QuizQuestion.find({ activity: lockedToken.activity }).select('_id');
    const validQuestionIds = new Set(questions.map((q) => q._id.toString()));

    const invalidAnswer = answers.find((answer) => !validQuestionIds.has(answer.questionId));
    if (invalidAnswer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answer payload: one or more question IDs do not belong to this quiz.',
      });
    }

    const submittedQuestionIds = answers.map((answer) => answer.questionId);
    if (new Set(submittedQuestionIds).size !== submittedQuestionIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate answers for the same question are not allowed.',
      });
    }

    const submittedAt = new Date();
    let normalizedAttemptStartedAt = null;
    let submissionDurationSeconds = null;

    if (attemptStartedAt) {
      const parsedStartedAt = new Date(attemptStartedAt);
      if (!Number.isNaN(parsedStartedAt.getTime()) && parsedStartedAt <= submittedAt) {
        const durationSeconds = Math.round((submittedAt.getTime() - parsedStartedAt.getTime()) / 1000);
        if (durationSeconds >= 0 && durationSeconds <= 24 * 60 * 60) {
          normalizedAttemptStartedAt = parsedStartedAt;
          submissionDurationSeconds = durationSeconds;
        }
      }
    }

    // Create submission
    const submission = await QuizSubmission.create({
      activity: lockedToken.activity,
      token: lockedToken._id,
      rollNo: normalizedRollNo,
      studentName: studentName.trim(),
      answers: answers.map((a) => ({
        question: a.questionId,
        answerText: a.answerText || '',
        selectedOptions: a.selectedOptions || [],
      })),
      ipAddress: req.ip || req.connection?.remoteAddress || '',
      submittedAt,
      attemptStartedAt: normalizedAttemptStartedAt,
      submissionDurationSeconds,
    });

    // Increment token usage
    await QuizAttemptToken.updateOne({ _id: lockedToken._id }, { $inc: { totalUses: 1 } });

    // Auto-evaluate the submission
    const evaluated = await evaluateSubmission(submission._id);

    logger.info('Quiz submitted and evaluated', {
      submissionId: submission._id,
      rollNo: normalizedRollNo,
      studentName,
      submissionDurationSeconds: submissionDurationSeconds ?? undefined,
      score: `${evaluated.totalMarksObtained}/${evaluated.totalMarksPossible}`,
    });

    // Return confirmation (NOT showing marks to student by default)
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully! Your responses have been recorded.',
      submissionId: submission._id,
    });
  } catch (err) {
    next(err);
  } finally {
    if (lockAcquired && lockedTokenId) {
      await QuizAttemptToken.updateOne(
        { _id: lockedTokenId },
        { $pull: { activeAttemptRollNos: normalizedRollNo } }
      ).catch((unlockErr) => {
        logger.warn('Failed to release quiz submission lock', {
          tokenId: lockedTokenId,
          rollNo: normalizedRollNo,
          error: unlockErr.message,
        });
      });
    }
  }
};

// ==========================================
// RESULTS & EVALUATION (Faculty — Authenticated)
// ==========================================

/** GET /api/quiz/submissions/:activityId — Get all submissions for a quiz activity */
exports.getSubmissions = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const search = (req.query.search || '').trim();
    const status = (req.query.status || '').trim().toLowerCase();
    const sortBy = (req.query.sortBy || 'rollNo').trim();
    const sortOrder = (req.query.sortOrder || 'asc').trim().toLowerCase() === 'desc' ? -1 : 1;

    const allowedStatus = new Set(['submitted', 'evaluated', 'reviewed', 'in-progress']);
    const allowedSortMap = {
      rollNo: 'rollNo',
      studentName: 'studentName',
      percentageScore: 'percentageScore',
      totalMarksObtained: 'totalMarksObtained',
      status: 'status',
      submittedAt: 'submittedAt',
      cieSynced: 'cieSynced',
    };

    const query = { activity: req.params.activityId };
    if (allowedStatus.has(status)) {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegExp(search), 'i');
      query.$or = [
        { rollNo: searchRegex },
        { studentName: searchRegex },
      ];
    }

    const sortField = allowedSortMap[sortBy] || 'rollNo';

    const submissions = await QuizSubmission.find(query)
      .populate('student', 'rollNo name')
      .sort({ [sortField]: sortOrder, submittedAt: -1 });

    // Get questions for column headers
    const questions = await QuizQuestion.find({ activity: req.params.activityId }).sort('order');

    res.json({
      success: true,
      submissions,
      questions,
      filters: {
        search,
        status: status && allowedStatus.has(status) ? status : 'all',
        sortBy: sortField,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      },
      summary: {
        total: submissions.length,
        evaluated: submissions.filter((s) => s.status === 'evaluated' || s.status === 'reviewed').length,
        cieSynced: submissions.filter((s) => s.cieSynced).length,
        averageScore: submissions.length > 0
          ? Math.round(
              (submissions.reduce((sum, s) => sum + s.percentageScore, 0) / submissions.length) * 100
            ) / 100
          : 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/quiz/submissions/detail/:submissionId — Get detailed submission */
exports.getSubmissionDetail = async (req, res, next) => {
  try {
    const submission = await QuizSubmission.findById(req.params.submissionId)
      .populate('student', 'rollNo name');
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const activity = await Activity.findById(submission.activity).select('faculty');
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const questions = await QuizQuestion.find({ activity: submission.activity }).sort('order');

    // Build detailed answer breakdown
    const questionMap = {};
    questions.forEach((q) => { questionMap[q._id.toString()] = q; });

    const breakdown = submission.answers.map((ans) => {
      const q = questionMap[ans.question.toString()];
      return {
        answerId: ans._id,
        questionText: q?.questionText || 'Unknown',
        questionType: q?.questionType || 'unknown',
        maxMarks: ans.maxMarks,
        awardedMarks: ans.facultyOverride !== null && ans.facultyOverride !== undefined
          ? ans.facultyOverride
          : ans.awardedMarks,
        isCorrect: ans.isCorrect,
        studentAnswer: ans.answerText,
        selectedOptions: ans.selectedOptions,
        evaluationNote: ans.evaluationNote,
        hasOverride: ans.facultyOverride !== null && ans.facultyOverride !== undefined,
        options: q?.options || [],
        expectedAnswer: q?.expectedAnswer || '',
      };
    });

    res.json({ success: true, submission, breakdown });
  } catch (err) {
    next(err);
  }
};

/** PATCH /api/quiz/submissions/:submissionId/override — Faculty overrides a question score */
exports.overrideScore = async (req, res, next) => {
  try {
    const { answerId, overrideMarks } = req.body;

    const submission = await QuizSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const activity = await Activity.findById(submission.activity).select('faculty status');
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (activity.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Activity is locked. Overrides are not allowed.' });
    }

    const answer = submission.answers.id(answerId);
    if (!answer) return res.status(404).json({ success: false, message: 'Answer not found.' });

    if (overrideMarks > answer.maxMarks) {
      return res.status(400).json({ success: false, message: `Override cannot exceed max marks (${answer.maxMarks}).` });
    }

    answer.facultyOverride = overrideMarks;

    // Recalculate totals
    let totalObtained = 0;
    let totalPossible = 0;
    submission.answers.forEach((a) => {
      const marks = a.facultyOverride !== null && a.facultyOverride !== undefined
        ? a.facultyOverride
        : a.awardedMarks;
      totalObtained += marks;
      totalPossible += a.maxMarks;
    });

    submission.totalMarksObtained = Math.round(totalObtained * 100) / 100;
    submission.totalMarksPossible = totalPossible;
    submission.percentageScore = totalPossible > 0
      ? Math.round((totalObtained / totalPossible) * 100 * 100) / 100
      : 0;
    submission.status = 'reviewed';
    submission.cieSynced = false; // Needs re-sync after override

    await submission.save();

    audit.log({
      req,
      action: 'QUIZ_SCORE_OVERRIDE',
      entityType: 'QuizSubmission',
      entityId: submission._id,
      description: `Faculty overrode score for ${submission.rollNo}: answer ${answerId} → ${overrideMarks}`,
    });

    res.json({ success: true, submission });
  } catch (err) {
    next(err);
  }
};

/** POST /api/quiz/sync-cie/:activityId — Sync all quiz scores to CIE */
exports.syncToCIE = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId);
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const result = await syncAllSubmissionsToCIE(req.params.activityId, req.user._id);

    audit.log({
      req,
      action: 'QUIZ_CIE_SYNC',
      entityType: 'Activity',
      entityId: req.params.activityId,
      description: `Quiz scores synced to CIE: ${result.totalSynced} synced, ${result.totalFailed} failed`,
    });

    res.json({
      success: true,
      message: `Synced ${result.totalSynced} submissions to CIE. ${result.totalFailed} failed.`,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/quiz/sync-cie/single/:submissionId — Sync single submission to CIE */
exports.syncSingleToCIE = async (req, res, next) => {
  try {
    const submission = await QuizSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found.' });

    const activity = await Activity.findById(submission.activity).select('faculty');
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    if (req.user.role === 'faculty' && activity.faculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const result = await syncSubmissionToCIE(submission._id, req.user._id);

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};
