// ==========================================
// Quiz Evaluation Engine — Auto-scoring for quiz submissions
// ==========================================
// Evaluates student answers against defined correct answers,
// calculates scores, and syncs results into the existing
// CIE Score model for seamless grade integration.

const mongoose = require('mongoose');
const QuizQuestion = require('../models/QuizQuestion');
const QuizSubmission = require('../models/QuizSubmission');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const Score = require('../models/Score');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const { recomputeSubjectResults } = require('./scoringEngine');
const logger = require('./logger');

const escapeRegExp = (value = '') => value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Evaluate a single answer against its question definition.
 * @param {Object} question - QuizQuestion document
 * @param {Object} answer - Answer from submission { answerText, selectedOptions }
 * @returns {{ awardedMarks, maxMarks, isCorrect, evaluationNote }}
 */
function evaluateAnswer(question, answer) {
  const result = {
    awardedMarks: 0,
    maxMarks: question.marks,
    isCorrect: false,
    evaluationNote: '',
  };

  switch (question.questionType) {
    case 'mcq': {
      const correctOptions = question.options.filter((o) => o.isCorrect).map((o) => o._id.toString());
      const selected = (answer.selectedOptions || []).map((id) => id.toString());

      if (correctOptions.length === 0) {
        result.evaluationNote = 'No correct answer defined for this question.';
        break;
      }

      // Check if selected matches correct
      const allCorrectSelected = correctOptions.every((c) => selected.includes(c));
      const noExtraSelected = selected.every((s) => correctOptions.includes(s));

      if (allCorrectSelected && noExtraSelected && selected.length > 0) {
        result.awardedMarks = question.marks;
        result.isCorrect = true;
        result.evaluationNote = 'Correct answer.';
      } else if (question.allowPartialScoring && selected.length > 0) {
        // Partial scoring: award marks proportional to correct selections
        const correctCount = selected.filter((s) => correctOptions.includes(s)).length;
        const wrongCount = selected.filter((s) => !correctOptions.includes(s)).length;
        const partialScore = Math.max(0, (correctCount - wrongCount) / correctOptions.length);
        result.awardedMarks = Math.round(partialScore * question.marks * 100) / 100;
        result.evaluationNote = `Partial scoring: ${correctCount} correct, ${wrongCount} incorrect out of ${correctOptions.length}.`;
      } else {
        result.awardedMarks = 0;
        result.isCorrect = false;
        result.evaluationNote = 'Incorrect answer.';
      }
      break;
    }

    case 'short': {
      if (!question.expectedAnswer || !answer.answerText) {
        result.evaluationNote = answer.answerText
          ? 'No expected answer defined — requires manual review.'
          : 'No answer provided.';
        break;
      }

      // Keyword-based matching
      const keywords = question.expectedAnswer
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length > 0);

      if (keywords.length === 0) {
        result.evaluationNote = 'No keywords defined for evaluation.';
        break;
      }

      const studentAnswer = answer.answerText.toLowerCase().trim();
      const matchedKeywords = keywords.filter((kw) => studentAnswer.includes(kw));
      const matchRatio = matchedKeywords.length / keywords.length;

      if (matchRatio >= 0.9) {
        result.awardedMarks = question.marks;
        result.isCorrect = true;
        result.evaluationNote = `All keywords matched: ${matchedKeywords.join(', ')}.`;
      } else if (question.allowPartialScoring && matchRatio > 0) {
        result.awardedMarks = Math.round(matchRatio * question.marks * 100) / 100;
        result.evaluationNote = `Partial match (${matchedKeywords.length}/${keywords.length}): ${matchedKeywords.join(', ')}.`;
      } else if (matchRatio > 0) {
        // Even without partial scoring flag, give half marks if some keywords match
        result.awardedMarks = Math.round(0.5 * question.marks * 100) / 100;
        result.evaluationNote = `Some keywords matched (${matchedKeywords.length}/${keywords.length}).`;
      } else {
        result.evaluationNote = 'No matching keywords found.';
      }
      break;
    }

    case 'descriptive': {
      // Descriptive questions cannot be fully auto-graded.
      // Award 0 marks pending faculty review.
      if (answer.answerText && answer.answerText.trim().length > 0) {
        result.evaluationNote = 'Descriptive answer submitted — pending faculty review.';
        // Give a baseline score based on answer length as a placeholder
        const wordCount = answer.answerText.trim().split(/\s+/).length;
        if (wordCount >= 50) {
          result.awardedMarks = Math.round(0.5 * question.marks * 100) / 100; // 50% base for substantial answer
          result.evaluationNote = `Descriptive answer (${wordCount} words) — 50% base score pending faculty review.`;
        } else if (wordCount >= 20) {
          result.awardedMarks = Math.round(0.3 * question.marks * 100) / 100;
          result.evaluationNote = `Descriptive answer (${wordCount} words) — 30% base score pending faculty review.`;
        } else {
          result.awardedMarks = 0;
          result.evaluationNote = `Brief descriptive answer (${wordCount} words) — pending faculty review.`;
        }
      } else {
        result.evaluationNote = 'No answer provided.';
      }
      break;
    }

    default:
      result.evaluationNote = `Unknown question type: ${question.questionType}`;
  }

  return result;
}

/**
 * Evaluate a full quiz submission.
 * @param {string} submissionId - QuizSubmission document ID
 * @returns {Object} Updated submission with evaluated scores
 */
async function evaluateSubmission(submissionId) {
  const submission = await QuizSubmission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');

  const questions = await QuizQuestion.find({ activity: submission.activity }).sort('order');
  const questionMap = {};
  questions.forEach((q) => { questionMap[q._id.toString()] = q; });

  let totalObtained = 0;
  let totalPossible = 0;

  // Evaluate each answer
  const evaluatedAnswers = submission.answers.map((ans) => {
    const question = questionMap[ans.question.toString()];
    if (!question) {
      return {
        ...ans.toObject(),
        awardedMarks: 0,
        maxMarks: 0,
        evaluationNote: 'Question not found.',
      };
    }

    const result = evaluateAnswer(question, ans);
    totalObtained += result.awardedMarks;
    totalPossible += result.maxMarks;

    return {
      ...ans.toObject(),
      awardedMarks: result.awardedMarks,
      maxMarks: result.maxMarks,
      isCorrect: result.isCorrect,
      evaluationNote: result.evaluationNote,
    };
  });

  // Update submission
  submission.answers = evaluatedAnswers;
  submission.totalMarksObtained = Math.round(totalObtained * 100) / 100;
  submission.totalMarksPossible = totalPossible;
  submission.percentageScore = totalPossible > 0
    ? Math.round((totalObtained / totalPossible) * 100 * 100) / 100
    : 0;
  submission.status = 'evaluated';
  submission.evaluatedAt = new Date();

  await submission.save();

  logger.info('Quiz submission evaluated', {
    submissionId: submission._id,
    rollNo: submission.rollNo,
    score: `${submission.totalMarksObtained}/${submission.totalMarksPossible}`,
    percentage: submission.percentageScore,
  });

  return submission;
}

/**
 * Map quiz percentage to a 1-5 rubric scale score.
 * @param {number} percentage - 0 to 100
 * @returns {number} 1-5 scale score
 */
function percentageToRubricScore(percentage) {
  if (percentage >= 80) return 5;
  if (percentage >= 60) return 4;
  if (percentage >= 40) return 3;
  if (percentage >= 20) return 2;
  return 1;
}

const RUBRIC_METRIC_KEYWORDS = {
  accuracy: ['accuracy', 'correct', 'correctness', 'precision', 'answer quality'],
  conceptual: ['concept', 'clarity', 'understanding', 'logic', 'depth', 'explanation'],
  time: ['time', 'punctual', 'speed', 'deadline', 'management'],
};

function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function safeRatio(obtained, possible, fallback = 0) {
  if (!possible || possible <= 0) return fallback;
  const ratio = obtained / possible;
  if (Number.isNaN(ratio) || !Number.isFinite(ratio)) return fallback;
  return Math.max(0, Math.min(1, ratio));
}

function getEffectiveMarks(answer, maxMarks) {
  const rawMarks = answer.facultyOverride !== null && answer.facultyOverride !== undefined
    ? Number(answer.facultyOverride)
    : Number(answer.awardedMarks || 0);
  if (!Number.isFinite(rawMarks)) return 0;
  return Math.max(0, Math.min(maxMarks, rawMarks));
}

function resolveRubricMetricType(rubricName = '') {
  const normalizedName = rubricName.toLowerCase();

  if (RUBRIC_METRIC_KEYWORDS.accuracy.some((keyword) => normalizedName.includes(keyword))) {
    return 'accuracy';
  }

  if (RUBRIC_METRIC_KEYWORDS.conceptual.some((keyword) => normalizedName.includes(keyword))) {
    return 'conceptual';
  }

  if (RUBRIC_METRIC_KEYWORDS.time.some((keyword) => normalizedName.includes(keyword))) {
    return 'time';
  }

  return 'overall';
}

function computeExpectedDurationSeconds(questions = []) {
  if (!questions.length) return 0;

  return questions.reduce((total, question) => {
    switch (question.questionType) {
      case 'mcq':
        return total + 60;
      case 'short':
        return total + 120;
      case 'descriptive':
        return total + 300;
      default:
        return total + 120;
    }
  }, 0);
}

function computeRubricMetricRatios(submission, questions, questionMap) {
  let overallObtained = 0;
  let overallPossible = 0;

  let accuracyObtained = 0;
  let accuracyPossible = 0;

  let conceptualObtained = 0;
  let conceptualPossible = 0;

  submission.answers.forEach((answer) => {
    const question = questionMap.get(answer.question.toString());
    const maxMarks = Number(answer.maxMarks || question?.marks || 0);
    if (!Number.isFinite(maxMarks) || maxMarks <= 0) return;

    const obtainedMarks = getEffectiveMarks(answer, maxMarks);

    overallObtained += obtainedMarks;
    overallPossible += maxMarks;

    if (question?.questionType === 'mcq' || question?.questionType === 'short') {
      accuracyObtained += obtainedMarks;
      accuracyPossible += maxMarks;
    }

    if (question?.questionType === 'short' || question?.questionType === 'descriptive') {
      conceptualObtained += obtainedMarks;
      conceptualPossible += maxMarks;
    }
  });

  const overallRatio = safeRatio(overallObtained, overallPossible, 0);
  const accuracyRatio = safeRatio(accuracyObtained, accuracyPossible, overallRatio);
  const conceptualRatio = safeRatio(conceptualObtained, conceptualPossible, overallRatio);

  let timeRatio = overallRatio;
  const durationSeconds = Number(submission.submissionDurationSeconds);
  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    const expectedSeconds = computeExpectedDurationSeconds(questions);
    if (expectedSeconds > 0) {
      if (durationSeconds <= expectedSeconds * 0.9) {
        timeRatio = 1;
      } else if (durationSeconds <= expectedSeconds * 1.1) {
        timeRatio = 0.8;
      } else if (durationSeconds <= expectedSeconds * 1.35) {
        timeRatio = 0.6;
      } else if (durationSeconds <= expectedSeconds * 1.7) {
        timeRatio = 0.4;
      } else {
        timeRatio = 0.2;
      }
    }
  }

  return {
    overall: overallRatio,
    accuracy: accuracyRatio,
    conceptual: conceptualRatio,
    time: timeRatio,
  };
}

/**
 * Sync quiz submission scores to the CIE Score model.
 * Maps quiz percentage to rubric scores for each ActivityRubric,
 * so the existing scoring engine picks them up automatically.
 *
 * @param {string} submissionId - QuizSubmission document ID
 * @param {string} facultyId - Faculty user ID for gradedBy field
 * @returns {Object} { synced, rubricCount, rubricScore }
 */
async function syncSubmissionToCIE(submissionId, facultyId) {
  const submission = await QuizSubmission.findById(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.status !== 'evaluated' && submission.status !== 'reviewed') {
    throw new Error('Submission must be evaluated before CIE sync');
  }

  const activity = await Activity.findById(submission.activity).populate('subject');
  if (!activity) throw new Error('Activity not found');

  // Find the student in the system by rollNo
  const subject = await Subject.findById(activity.subject._id || activity.subject);
  if (!subject) throw new Error('Subject not found');

  const student = await Student.findOne({
    rollNo: { $regex: new RegExp(`^${escapeRegExp(submission.rollNo)}$`, 'i') },
    class: subject.class,
    academicYear: subject.academicYear,
  });

  if (!student) {
    logger.warn('Student not found for CIE sync', {
      rollNo: submission.rollNo,
      classId: subject.class,
    });
    return { synced: false, reason: 'Student not found in class roster' };
  }

  // Link student to submission
  submission.student = student._id;
  await submission.save();

  // Get activity rubrics
  const rubrics = await ActivityRubric.find({ activity: submission.activity }).sort('order');
  if (rubrics.length === 0) {
    return { synced: false, reason: 'No rubrics defined for this activity' };
  }

  const questions = await QuizQuestion.find({ activity: submission.activity }).select('questionType marks');
  const questionMap = new Map(questions.map((question) => [question._id.toString(), question]));
  const metricRatios = computeRubricMetricRatios(submission, questions, questionMap);

  const rubricScores = rubrics.map((rubric) => {
    const metricType = resolveRubricMetricType(rubric.name);
    const metricRatio = metricRatios[metricType] ?? metricRatios.overall;
    const metricPercentage = clampPercentage(metricRatio * 100);
    const rubricScore = percentageToRubricScore(metricPercentage);

    return {
      rubricId: rubric._id,
      rubricName: rubric.name,
      metricType,
      metricPercentage,
      rubricScore,
    };
  });

  const ops = rubricScores.map((item) => ({
    updateOne: {
      filter: {
        activity: submission.activity,
        student: student._id,
        rubric: item.rubricId,
      },
      update: {
        $set: {
          score: item.rubricScore,
          gradedBy: facultyId,
        },
      },
      upsert: true,
    },
  }));

  await Score.bulkWrite(ops);

  // Mark submission as CIE-synced
  submission.cieSynced = true;
  await submission.save();

  // Recompute subject results
  await recomputeSubjectResults(subject._id, [student._id]);

  const overallRubricScore = percentageToRubricScore(submission.percentageScore);

  logger.info('Quiz submission synced to CIE', {
    submissionId: submission._id,
    studentId: student._id,
    rubricScore: overallRubricScore,
    rubricCount: rubrics.length,
    rubricScores: rubricScores.map((item) => ({
      rubricName: item.rubricName,
      score: item.rubricScore,
      metricType: item.metricType,
    })),
  });

  return {
    synced: true,
    studentId: student._id,
    rubricCount: rubrics.length,
    rubricScore: overallRubricScore,
    rubricScores,
    percentageScore: submission.percentageScore,
  };
}

/**
 * Sync ALL evaluated submissions for an activity to CIE.
 * @param {string} activityId
 * @param {string} facultyId
 * @returns {Object} { totalSynced, totalFailed, results }
 */
async function syncAllSubmissionsToCIE(activityId, facultyId) {
  const submissions = await QuizSubmission.find({
    activity: activityId,
    status: { $in: ['evaluated', 'reviewed'] },
  });

  let totalSynced = 0;
  let totalFailed = 0;
  const results = [];

  for (const sub of submissions) {
    try {
      const result = await syncSubmissionToCIE(sub._id, facultyId);
      if (result.synced) {
        totalSynced++;
      } else {
        totalFailed++;
      }
      results.push({ rollNo: sub.rollNo, ...result });
    } catch (err) {
      totalFailed++;
      results.push({ rollNo: sub.rollNo, synced: false, reason: err.message });
    }
  }

  logger.info('Batch CIE sync completed', {
    activityId,
    totalSynced,
    totalFailed,
  });

  return { totalSynced, totalFailed, results };
}

module.exports = {
  evaluateAnswer,
  evaluateSubmission,
  syncSubmissionToCIE,
  syncAllSubmissionsToCIE,
  percentageToRubricScore,
};
