// ==========================================
// Onboarding Controller — Faculty progress
// ==========================================

const Activity = require('../models/Activity');
const Score = require('../models/Score');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

const CONSISTENCY_ACTIONS = ['ACTIVITY_CREATE', 'ACTIVITY_SUBMIT', 'SCORES_BULK_SAVE', 'LEARNING_GUIDE_VIEW'];
const TIMELINE_ACTIONS = ['ACTIVITY_CREATE', 'ACTIVITY_SUBMIT', 'SCORES_BULK_SAVE', 'LEARNING_GUIDE_VIEW'];
const SEMESTER_CIE_MIN = 2;
const SEMESTER_CIE_MAX = 3;

function toProgress(current, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function buildBadges(metrics) {
  const definitions = [
    {
      id: 'guide-explorer',
      title: 'Guide Explorer',
      subtitle: 'View 3 learning guides',
      current: metrics.guideViews,
      target: 3,
    },
    {
      id: 'activity-starter',
      title: 'Activity Starter',
      subtitle: 'Create your first activity',
      current: metrics.activitiesCreated,
      target: 1,
    },
    {
      id: 'assessment-builder',
      title: 'CIE Cycle Complete',
      subtitle: 'Create 2 CIE activities (semester target)',
      current: metrics.activitiesCreated,
      target: SEMESTER_CIE_MIN,
    },
    {
      id: 'cie-plus',
      title: 'CIE Plus',
      subtitle: 'Reach 3 CIE activities in a semester',
      current: metrics.activitiesCreated,
      target: SEMESTER_CIE_MAX,
    },
    {
      id: 'rubric-finisher',
      title: 'Finalization Finisher',
      subtitle: 'Finalize 2 activities',
      current: metrics.activitiesFinalized,
      target: 2,
    },
    {
      id: 'grading-sprint',
      title: 'Grading Sprint',
      subtitle: 'Grade 30 students',
      current: metrics.studentsGraded,
      target: 30,
    },
    {
      id: 'consistency',
      title: 'Consistency',
      subtitle: 'Be active for 4 weeks in last 8',
      current: metrics.activeWeeksLast8,
      target: 4,
    },
  ];

  return definitions.map((badge) => ({
    ...badge,
    earned: badge.current >= badge.target,
    progressPercent: toProgress(badge.current, badge.target),
  }));
}

function mapTimelineAction(action) {
  switch (action) {
    case 'ACTIVITY_CREATE': return 'Created a CIE activity';
    case 'ACTIVITY_SUBMIT': return 'Finalized a CIE activity';
    case 'SCORES_BULK_SAVE': return 'Saved student grading scores';
    case 'LEARNING_GUIDE_VIEW': return 'Viewed a learning guide';
    default: return action;
  }
}

function buildMonthlyGoals(monthly) {
  const goals = [
    {
      id: 'goal-guide-monthly',
      title: 'Guide Engagement',
      subtitle: 'View at least 2 guides this month',
      current: monthly.guideViews,
      target: 2,
    },
    {
      id: 'goal-cie-create-monthly',
      title: 'CIE Planning',
      subtitle: 'Create 1 CIE activity this month',
      current: monthly.activitiesCreated,
      target: 1,
    },
    {
      id: 'goal-cie-finalize-monthly',
      title: 'CIE Finalization',
      subtitle: 'Finalize 1 CIE activity this month',
      current: monthly.activitiesFinalized,
      target: 1,
    },
    {
      id: 'goal-grading-monthly',
      title: 'Grading Throughput',
      subtitle: 'Grade 25 students this month',
      current: monthly.studentsGraded,
      target: 25,
    },
  ];

  return goals.map((goal) => ({
    ...goal,
    completed: goal.current >= goal.target,
    progressPercent: toProgress(goal.current, goal.target),
  }));
}

async function computeFacultyProgress(facultyId) {
  const eightWeeksAgo = new Date(Date.now() - (8 * 7 * 24 * 60 * 60 * 1000));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [activities, firstGuideView, guideViewCount, activeWeekRows] = await Promise.all([
    Activity.find({ faculty: facultyId })
      .select('_id status createdAt submittedAt lockedAt')
      .sort({ createdAt: 1 })
      .lean(),
    AuditLog.findOne({ user: facultyId, action: 'LEARNING_GUIDE_VIEW' })
      .sort({ createdAt: 1 })
      .select('createdAt')
      .lean(),
    AuditLog.countDocuments({ user: facultyId, action: 'LEARNING_GUIDE_VIEW' }),
    AuditLog.aggregate([
      {
        $match: {
          user: facultyId,
          action: { $in: CONSISTENCY_ACTIONS },
          createdAt: { $gte: eightWeeksAgo },
        },
      },
      {
        $project: {
          weekKey: {
            $dateToString: {
              format: '%G-%V',
              date: '$createdAt',
            },
          },
        },
      },
      { $group: { _id: '$weekKey' } },
    ]),
  ]);

  const activityIds = activities.map((activity) => activity._id);

  const firstCreated = activities[0] || null;

  const finalizedActivities = activities.filter(
    (activity) => activity.status === 'submitted' || activity.status === 'locked'
  );

  const firstFinalized = finalizedActivities
    .map((activity) => ({
      completedAt: activity.submittedAt || activity.lockedAt || activity.createdAt,
    }))
    .sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt))[0] || null;

  let firstGradingAction = null;
  let gradedStudents = [];
  let scoreEntriesCount = 0;
  let monthlyStudentsGraded = [];

  if (activityIds.length > 0) {
    [firstGradingAction, gradedStudents, scoreEntriesCount, monthlyStudentsGraded] = await Promise.all([
      Score.findOne({ activity: { $in: activityIds }, gradedBy: facultyId })
        .sort({ createdAt: 1 })
        .select('createdAt')
        .lean(),
      Score.distinct('student', { activity: { $in: activityIds }, gradedBy: facultyId }),
      Score.countDocuments({ activity: { $in: activityIds }, gradedBy: facultyId }),
      Score.distinct('student', { activity: { $in: activityIds }, gradedBy: facultyId, createdAt: { $gte: monthStart } }),
    ]);
  }

  const [monthlyGuideViews, monthlyActivitiesCreated, monthlyActivitiesFinalized] = await Promise.all([
    AuditLog.countDocuments({ user: facultyId, action: 'LEARNING_GUIDE_VIEW', createdAt: { $gte: monthStart } }),
    Activity.countDocuments({ faculty: facultyId, createdAt: { $gte: monthStart } }),
    Activity.countDocuments({
      faculty: facultyId,
      status: { $in: ['submitted', 'locked'] },
      $or: [
        { submittedAt: { $gte: monthStart } },
        { lockedAt: { $gte: monthStart } },
      ],
    }),
  ]);

  const steps = [
    {
      id: 'guide',
      completed: !!firstGuideView,
      completedAt: firstGuideView?.createdAt || null,
    },
    {
      id: 'create',
      completed: !!firstCreated,
      completedAt: firstCreated?.createdAt || null,
    },
    {
      id: 'submit',
      completed: !!firstFinalized,
      completedAt: firstFinalized?.completedAt || null,
    },
    {
      id: 'grade',
      completed: !!firstGradingAction,
      completedAt: firstGradingAction?.createdAt || null,
    },
  ];

  const completedSteps = steps.filter((step) => step.completed).length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const activeWeeksLast8 = activeWeekRows.length;

  const metrics = {
    guideViews: guideViewCount,
    activitiesCreated: activities.length,
    activitiesFinalized: finalizedActivities.length,
    studentsGraded: gradedStudents.length,
    scoreEntries: scoreEntriesCount,
    activeWeeksLast8,
  };

  const badges = buildBadges(metrics);
  const earnedBadges = badges.filter((badge) => badge.earned).length;

  const points =
    (completedSteps * 100) +
    (Math.min(metrics.guideViews, 10) * 15) +
    (Math.min(metrics.activitiesCreated, 6) * 30) +
    (Math.min(metrics.activitiesFinalized, 6) * 35) +
    (Math.min(metrics.studentsGraded, 200) * 2) +
    (Math.min(metrics.activeWeeksLast8, 8) * 30);

  const levelSize = 250;
  const level = Math.floor(points / levelSize) + 1;
  const currentLevelStart = (level - 1) * levelSize;
  const nextLevelAt = level * levelSize;
  const pointsInLevel = points - currentLevelStart;
  const levelProgressPercent = toProgress(pointsInLevel, levelSize);

  const monthly = {
    guideViews: monthlyGuideViews,
    activitiesCreated: monthlyActivitiesCreated,
    activitiesFinalized: monthlyActivitiesFinalized,
    studentsGraded: monthlyStudentsGraded.length,
  };

  const monthlyGoals = buildMonthlyGoals(monthly);
  const completedMonthlyGoals = monthlyGoals.filter((goal) => goal.completed).length;

  return {
    steps,
    summary: {
      completedSteps,
      totalSteps,
      progressPercent,
      activitiesCreated: activities.length,
      activitiesFinalized: finalizedActivities.length,
      studentsGraded: gradedStudents.length,
      guideViews: guideViewCount,
      scoreEntries: scoreEntriesCount,
      activeWeeksLast8,
      earnedBadges,
      semesterTargetCieMin: SEMESTER_CIE_MIN,
      semesterTargetCieMax: SEMESTER_CIE_MAX,
    },
    gamification: {
      points,
      level,
      nextLevelAt,
      pointsToNextLevel: Math.max(nextLevelAt - points, 0),
      levelProgressPercent,
      badges,
    },
    monthlyGoals,
    monthlySummary: {
      completedGoals: completedMonthlyGoals,
      totalGoals: monthlyGoals.length,
      completionPercent: toProgress(completedMonthlyGoals, monthlyGoals.length),
    },
  };
}

/** GET /api/onboarding/faculty/progress */
exports.getFacultyProgress = async (req, res, next) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ success: false, message: 'Only faculty can access onboarding progress.' });
    }

    const facultyId = req.user._id;
    const progress = await computeFacultyProgress(facultyId);

    const rawTimeline = await AuditLog.find({
      user: facultyId,
      action: { $in: TIMELINE_ACTIONS },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('action description createdAt')
      .lean();

    const timeline = rawTimeline.map((event) => ({
      action: event.action,
      label: mapTimelineAction(event.action),
      detail: event.description || '',
      createdAt: event.createdAt,
    }));

    res.json({
      success: true,
      progress: {
        ...progress,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/onboarding/faculty/leaderboard */
exports.getFacultyLeaderboard = async (req, res, next) => {
  try {
    const faculties = await User.find({ role: 'faculty', isActive: true })
      .select('_id name department')
      .lean();

    const rawRows = await Promise.all(faculties.map(async (faculty) => {
      const progress = await computeFacultyProgress(faculty._id);
      return {
        facultyId: String(faculty._id),
        name: faculty.name,
        department: faculty.department || 'General',
        points: progress.gamification.points,
        level: progress.gamification.level,
        earnedBadges: progress.summary.earnedBadges,
      };
    }));

    rawRows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.earnedBadges !== a.earnedBadges) return b.earnedBadges - a.earnedBadges;
      return a.name.localeCompare(b.name);
    });

    const ranked = rawRows.map((row, idx) => ({ ...row, rank: idx + 1 }));
    const top = ranked.slice(0, 10);
    const me = ranked.find((row) => row.facultyId === String(req.user._id)) || null;

    res.json({
      success: true,
      leaderboard: {
        top,
        me,
      },
    });
  } catch (err) {
    next(err);
  }
};
