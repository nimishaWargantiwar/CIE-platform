// ==========================================
// Scoring Engine — Production-Optimized
// ==========================================
// Fixes N+1 queries, uses aggregation pipelines,
// and supports atomic batch recalculation.

const mongoose = require('mongoose');
const Score = require('../models/Score');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const FinalSubjectResult = require('../models/FinalSubjectResult');
const logger = require('./logger');

/**
 * Calculate a single activity score for a student.
 * Formula: (SumRubricScore / MaxRubricScore) × ActivityTotalMarks
 */
async function calculateActivityScore(activityId, studentId) {
  const activity = await Activity.findById(activityId).lean();
  if (!activity) return null;

  const rubricCount = await ActivityRubric.countDocuments({ activity: activityId });
  if (rubricCount === 0) return { score: 0, totalMarks: activity.totalMarks, rubricsFilled: 0, totalRubrics: 0 };

  // Single aggregation instead of loading all score documents
  const [agg] = await Score.aggregate([
    {
      $match: {
        activity: new mongoose.Types.ObjectId(activityId),
        student: new mongoose.Types.ObjectId(studentId),
      },
    },
    { $group: { _id: null, sum: { $sum: '$score' }, count: { $sum: 1 } } },
  ]);

  const sumRubricScore = agg ? agg.sum : 0;
  const maxRubricScore = rubricCount * 5;
  const activityScore = (sumRubricScore / maxRubricScore) * activity.totalMarks;

  return {
    score: Math.round(activityScore * 100) / 100,
    totalMarks: activity.totalMarks,
    rubricsFilled: agg ? agg.count : 0,
    totalRubrics: rubricCount,
  };
}

/**
 * Calculate final subject score for a student (out of 15).
 * Formula: (RawTotal / MaxPossible) × 15
 * Optimized: batch lookups for rubric counts and score sums.
 */
async function calculateSubjectFinal(subjectId, studentId) {
  const activities = await Activity.find({ subject: subjectId }).lean();
  if (activities.length === 0) {
    return { rawTotal: 0, maxPossible: 0, finalOutOf15: 0, breakdown: [] };
  }

  const activityIds = activities.map((a) => a._id);

  // Batch: rubric counts per activity (single aggregation)
  const rubricCounts = await ActivityRubric.aggregate([
    { $match: { activity: { $in: activityIds } } },
    { $group: { _id: '$activity', count: { $sum: 1 } } },
  ]);
  const rubricCountMap = {};
  rubricCounts.forEach((r) => { rubricCountMap[r._id.toString()] = r.count; });

  // Batch: score sums per activity for this student (single aggregation)
  const scoreSums = await Score.aggregate([
    {
      $match: {
        activity: { $in: activityIds },
        student: new mongoose.Types.ObjectId(studentId),
      },
    },
    { $group: { _id: '$activity', sum: { $sum: '$score' }, count: { $sum: 1 } } },
  ]);
  const scoreSumMap = {};
  scoreSums.forEach((s) => { scoreSumMap[s._id.toString()] = s; });

  let rawTotal = 0;
  let maxPossible = 0;
  const breakdown = [];

  for (const activity of activities) {
    const aid = activity._id.toString();
    const rubricCount = rubricCountMap[aid] || 0;
    if (rubricCount === 0) continue;

    const scoreAgg = scoreSumMap[aid];
    const sumScore = scoreAgg ? scoreAgg.sum : 0;
    const maxRubric = rubricCount * 5;
    const actScore = Math.round(((sumScore / maxRubric) * activity.totalMarks) * 100) / 100;

    rawTotal += actScore;
    maxPossible += activity.totalMarks;
    breakdown.push({
      activity: activity._id,
      activityName: activity.name,
      score: actScore,
      totalMarks: activity.totalMarks,
    });
  }

  const finalOutOf15 = maxPossible > 0
    ? Math.round(((rawTotal / maxPossible) * 15) * 100) / 100
    : 0;

  return { rawTotal, maxPossible, finalOutOf15, breakdown };
}

/**
 * Recompute and persist final results for ALL students in a subject.
 * Uses bulkWrite for atomic persistence (Phase 1 requirement).
 */
async function recomputeSubjectResults(subjectId, studentIds) {
  if (!studentIds || studentIds.length === 0) return [];

  const startTime = Date.now();
  const bulkOps = [];

  // Process in parallel batches of 50 to balance speed vs memory
  const batchSize = 50;
  for (let i = 0; i < studentIds.length; i += batchSize) {
    const batch = studentIds.slice(i, i + batchSize);
    const calcs = await Promise.all(
      batch.map((sid) => calculateSubjectFinal(subjectId, sid))
    );

    calcs.forEach((calc, idx) => {
      bulkOps.push({
        updateOne: {
          filter: { subject: subjectId, student: batch[idx] },
          update: {
            $set: {
              rawTotal: calc.rawTotal,
              maxPossible: calc.maxPossible,
              finalOutOf15: calc.finalOutOf15,
              activityBreakdown: calc.breakdown,
            },
          },
          upsert: true,
        },
      });
    });
  }

  if (bulkOps.length > 0) {
    await FinalSubjectResult.bulkWrite(bulkOps, { ordered: false });
  }

  const elapsed = Date.now() - startTime;
  logger.info('Subject results recomputed', {
    subjectId,
    studentCount: studentIds.length,
    durationMs: elapsed,
  });

  return bulkOps;
}

/**
 * Get rubric-level averages for an activity (for AI insights).
 * Uses single aggregation pipeline instead of N+1 queries.
 */
async function getRubricAverages(activityId) {
  const rubrics = await ActivityRubric.find({ activity: activityId }).sort('order').lean();
  if (rubrics.length === 0) return [];

  // Single aggregation for all rubric averages
  const avgResults = await Score.aggregate([
    { $match: { activity: new mongoose.Types.ObjectId(activityId) } },
    {
      $group: {
        _id: '$rubric',
        avgScore: { $avg: '$score' },
        totalResponses: { $sum: 1 },
      },
    },
  ]);

  const avgMap = {};
  avgResults.forEach((a) => { avgMap[a._id.toString()] = a; });

  return rubrics.map((rubric) => {
    const agg = avgMap[rubric._id.toString()];
    return {
      rubricId: rubric._id,
      rubricName: rubric.name,
      avgScore: agg ? Math.round(agg.avgScore * 100) / 100 : 0,
      totalResponses: agg ? agg.totalResponses : 0,
    };
  });
}

/**
 * Get score distribution for a subject (for reports).
 * Uses $bucket aggregation instead of loading all docs.
 */
async function getScoreDistribution(subjectId) {
  const results = await FinalSubjectResult.aggregate([
    { $match: { subject: new mongoose.Types.ObjectId(subjectId) } },
    {
      $bucket: {
        groupBy: '$finalOutOf15',
        boundaries: [0, 3, 6, 9, 12, 15.01],
        default: 'other',
        output: { count: { $sum: 1 } },
      },
    },
  ]);

  const distribution = { '0-3': 0, '3-6': 0, '6-9': 0, '9-12': 0, '12-15': 0 };
  const rangeMap = { 0: '0-3', 3: '3-6', 6: '6-9', 9: '9-12', 12: '12-15' };

  results.forEach((bucket) => {
    if (rangeMap[bucket._id] !== undefined) {
      distribution[rangeMap[bucket._id]] = bucket.count;
    }
  });

  return distribution;
}

module.exports = {
  calculateActivityScore,
  calculateSubjectFinal,
  recomputeSubjectResults,
  getRubricAverages,
  getScoreDistribution,
};
