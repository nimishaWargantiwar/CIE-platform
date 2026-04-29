const mongoose = require('mongoose');

const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const QuizQuestion = require('../models/QuizQuestion');
const QuizSubmission = require('../models/QuizSubmission');
const QuizAttemptToken = require('../models/QuizAttemptToken');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Score = require('../models/Score');
const {
  evaluateSubmission,
  syncSubmissionToCIE,
} = require('../services/quizEvaluationEngine');

const MONGO_URI = process.env.VERIFY_MONGO_URI || 'mongodb://admin:secret@localhost:27017/pict_cie?authSource=admin';
const KEEP_TEST_DATA = process.env.KEEP_TEST_DATA === '1';

function metricFromRubricName(name = '') {
  const normalized = name.toLowerCase();
  if (normalized.includes('accuracy') || normalized.includes('correct')) return 'accuracy';
  if (normalized.includes('concept') || normalized.includes('clarity') || normalized.includes('understanding')) return 'conceptual';
  if (normalized.includes('time') || normalized.includes('management') || normalized.includes('speed')) return 'time';
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

function buildAnswerPayload(question) {
  if (question.questionType === 'mcq') {
    const correctOptions = (question.options || []).filter((option) => option.isCorrect).map((option) => option._id);
    const fallbackOption = question.options?.[0]?._id;

    return {
      question: question._id,
      answerText: '',
      selectedOptions: correctOptions.length > 0
        ? correctOptions
        : fallbackOption
          ? [fallbackOption]
          : [],
    };
  }

  if (question.questionType === 'short') {
    const expected = (question.expectedAnswer || '').split(',').map((value) => value.trim()).filter(Boolean);
    const answerText = expected.length > 0
      ? expected.join(' ')
      : 'Conceptual explanation with relevant keywords.';

    return {
      question: question._id,
      answerText,
      selectedOptions: [],
    };
  }

  return {
    question: question._id,
    answerText: 'This answer explains the topic in detail with clear conceptual understanding and structure for evaluation.',
    selectedOptions: [],
  };
}

async function findTargetActivity() {
  const activities = await Activity.find({ activityType: /quiz/i, status: { $ne: 'locked' } })
    .select('_id name faculty subject')
    .lean();

  for (const activity of activities) {
    const questionsCount = await QuizQuestion.countDocuments({ activity: activity._id });
    if (!questionsCount) continue;

    const rubrics = await ActivityRubric.find({ activity: activity._id }).select('name').lean();
    const rubricNames = rubrics.map((rubric) => rubric.name.toLowerCase());

    const hasAccuracy = rubricNames.some((name) => name.includes('accuracy') || name.includes('correct'));
    const hasConceptual = rubricNames.some((name) => name.includes('concept') || name.includes('clarity'));
    const hasTime = rubricNames.some((name) => name.includes('time') || name.includes('management'));

    if (hasAccuracy && hasConceptual && hasTime) {
      return activity;
    }
  }

  return null;
}

async function getRubricScores(activityId, studentId) {
  const scores = await Score.find({ activity: activityId, student: studentId })
    .populate('rubric', 'name')
    .sort({ createdAt: 1 })
    .lean();

  return scores.map((score) => ({
    rubricName: score.rubric?.name || 'Unknown Rubric',
    metric: metricFromRubricName(score.rubric?.name || ''),
    score: score.score,
  }));
}

function toMetricMap(rubricScores = []) {
  const map = { accuracy: null, conceptual: null, time: null, overall: null };
  rubricScores.forEach((item) => {
    const metric = metricFromRubricName(item.rubricName);
    if (map[metric] === null) map[metric] = item.score;
  });
  return map;
}

async function main() {
  const artifacts = {
    students: [],
    submissions: [],
  };

  try {
    await mongoose.connect(MONGO_URI);

    const targetActivity = await findTargetActivity();
    if (!targetActivity) {
      throw new Error('No quiz activity found with Accuracy, Conceptual, and Time rubrics plus at least one question.');
    }

    const rubrics = await ActivityRubric.find({ activity: targetActivity._id }).sort('order').lean();
    const questions = await QuizQuestion.find({ activity: targetActivity._id }).sort('order').lean();

    const subject = await Subject.findById(targetActivity.subject).select('class academicYear').lean();
    if (!subject) {
      throw new Error('Target activity has no subject.');
    }

    let token = await QuizAttemptToken.findOne({ activity: targetActivity._id }).sort('-createdAt');
    if (!token) {
      token = await QuizAttemptToken.create({
        activity: targetActivity._id,
        token: QuizAttemptToken.generateToken(),
        generatedBy: targetActivity.faculty,
        maxAttempts: 10,
        allowMultipleAttempts: true,
        isActive: true,
      });
    }

    const suffix = `${Date.now()}`;
    const fastRollNo = `QA_SYNC_FAST_${suffix}`;
    const slowRollNo = `QA_SYNC_SLOW_${suffix}`;

    const fastStudent = await Student.create({
      rollNo: fastRollNo,
      name: 'QA Fast Student',
      class: subject.class,
      academicYear: subject.academicYear,
    });

    const slowStudent = await Student.create({
      rollNo: slowRollNo,
      name: 'QA Slow Student',
      class: subject.class,
      academicYear: subject.academicYear,
    });

    artifacts.students.push(fastStudent._id, slowStudent._id);

    const answersPayload = questions.map((question) => buildAnswerPayload(question));

    const expectedDurationSeconds = computeExpectedDurationSeconds(questions);
    const fastDuration = Math.max(20, Math.round(expectedDurationSeconds * 0.8) || 20);
    const slowDuration = Math.max(fastDuration + 60, Math.round(expectedDurationSeconds * 1.9) || 180);

    const now = Date.now();

    const fastSubmission = await QuizSubmission.create({
      activity: targetActivity._id,
      token: token._id,
      student: fastStudent._id,
      rollNo: fastRollNo,
      studentName: fastStudent.name,
      answers: answersPayload,
      submittedAt: new Date(now),
      attemptStartedAt: new Date(now - fastDuration * 1000),
      submissionDurationSeconds: fastDuration,
      status: 'submitted',
      cieSynced: false,
    });

    const slowSubmission = await QuizSubmission.create({
      activity: targetActivity._id,
      token: token._id,
      student: slowStudent._id,
      rollNo: slowRollNo,
      studentName: slowStudent.name,
      answers: answersPayload,
      submittedAt: new Date(now + 1000),
      attemptStartedAt: new Date(now + 1000 - slowDuration * 1000),
      submissionDurationSeconds: slowDuration,
      status: 'submitted',
      cieSynced: false,
    });

    artifacts.submissions.push(fastSubmission._id, slowSubmission._id);

    await evaluateSubmission(fastSubmission._id);
    await evaluateSubmission(slowSubmission._id);

    await syncSubmissionToCIE(fastSubmission._id, targetActivity.faculty);
    await syncSubmissionToCIE(slowSubmission._id, targetActivity.faculty);

    const firstFastScores = await getRubricScores(targetActivity._id, fastStudent._id);
    const firstSlowScores = await getRubricScores(targetActivity._id, slowStudent._id);

    const firstFastMap = toMetricMap(firstFastScores);
    const firstSlowMap = toMetricMap(firstSlowScores);

    await Score.updateMany(
      {
        activity: targetActivity._id,
        student: { $in: [fastStudent._id, slowStudent._id] },
      },
      {
        $set: { score: 5 },
      }
    );

    await syncSubmissionToCIE(fastSubmission._id, targetActivity.faculty);
    await syncSubmissionToCIE(slowSubmission._id, targetActivity.faculty);

    const resyncFastScores = await getRubricScores(targetActivity._id, fastStudent._id);
    const resyncSlowScores = await getRubricScores(targetActivity._id, slowStudent._id);

    const resyncFastMap = toMetricMap(resyncFastScores);
    const resyncSlowMap = toMetricMap(resyncSlowScores);

    const result = {
      activity: {
        id: String(targetActivity._id),
        name: targetActivity.name,
        rubricNames: rubrics.map((rubric) => rubric.name),
        questionCount: questions.length,
      },
      submissions: {
        fast: {
          rollNo: fastRollNo,
          durationSeconds: fastDuration,
          firstSyncScores: firstFastScores,
          resyncScores: resyncFastScores,
        },
        slow: {
          rollNo: slowRollNo,
          durationSeconds: slowDuration,
          firstSyncScores: firstSlowScores,
          resyncScores: resyncSlowScores,
        },
      },
      checks: {
        similarAccuracy: firstFastMap.accuracy === null || firstSlowMap.accuracy === null
          ? 'NOT_APPLICABLE'
          : Math.abs(firstFastMap.accuracy - firstSlowMap.accuracy) <= 1,
        similarConceptual: firstFastMap.conceptual === null || firstSlowMap.conceptual === null
          ? 'NOT_APPLICABLE'
          : Math.abs(firstFastMap.conceptual - firstSlowMap.conceptual) <= 1,
        timeDropsForSlowSubmission: firstFastMap.time === null || firstSlowMap.time === null
          ? 'NOT_APPLICABLE'
          : firstSlowMap.time < firstFastMap.time,
        resyncRecomputedFromOldStyleFlatScores: resyncSlowMap.time === null
          ? 'NOT_APPLICABLE'
          : resyncSlowMap.time < 5,
      },
    };

    console.log(JSON.stringify(result, null, 2));

    if (!KEEP_TEST_DATA) {
      await Score.deleteMany({
        activity: targetActivity._id,
        student: { $in: [fastStudent._id, slowStudent._id] },
      });
      await QuizSubmission.deleteMany({ _id: { $in: [fastSubmission._id, slowSubmission._id] } });
      await Student.deleteMany({ _id: { $in: [fastStudent._id, slowStudent._id] } });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('VERIFY_QUIZ_RUBRIC_SYNC_FAILED');
    console.error(error);

    if (!KEEP_TEST_DATA) {
      try {
        if (artifacts.students.length) {
          await Score.deleteMany({ student: { $in: artifacts.students } });
          await Student.deleteMany({ _id: { $in: artifacts.students } });
        }
        if (artifacts.submissions.length) {
          await QuizSubmission.deleteMany({ _id: { $in: artifacts.submissions } });
        }
      } catch (cleanupError) {
        console.error('CLEANUP_FAILED', cleanupError.message);
      }
    }

    try {
      await mongoose.disconnect();
    } catch {
      // no-op
    }

    process.exit(1);
  }
}

main();
