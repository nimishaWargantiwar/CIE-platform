// ==========================================
// Learning Controller — Shared guide access
// ==========================================

const ActivityTemplate = require('../models/ActivityTemplate');
const Activity = require('../models/Activity');
const audit = require('../services/auditService');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanList(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function cleanTiming(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      phase: typeof item?.phase === 'string' ? item.phase.trim() : '',
      durationMinutes: Number(item?.durationMinutes) || 0,
    }))
    .filter((item) => item.phase && item.durationMinutes > 0);
}

function cleanSteps(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      title: typeof item?.title === 'string' ? item.title.trim() : '',
      durationMinutes: Number(item?.durationMinutes) || undefined,
      details: cleanList(item?.details),
    }))
    .filter((item) => item.title);
}

function normalizeLearningGuide(template) {
  const guide = template.learningGuide || {};
  const timingBreakdown = cleanTiming(guide.timingBreakdown);
  const conductSteps = cleanSteps(guide.conductSteps);

  const totalFromTiming = timingBreakdown.reduce((sum, b) => sum + b.durationMinutes, 0);
  const totalFromSteps = conductSteps.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

  return {
    objective: (guide.objective || template.guidelines || '').trim(),
    outcomes: cleanList(guide.outcomes),
    preparationChecklist: cleanList(guide.preparationChecklist),
    timingBreakdown,
    conductSteps,
    rubricMappingTips: cleanList(guide.rubricMappingTips),
    commonMistakes: cleanList(guide.commonMistakes),
    bestPractices: cleanList(guide.bestPractices),
    videoUrl: (guide.videoUrl || '').trim(),
    totalDurationMinutes: totalFromTiming || totalFromSteps || 0,
  };
}

function hasGuideContent(guide) {
  return Boolean(
    guide.objective ||
    guide.outcomes.length ||
    guide.preparationChecklist.length ||
    guide.timingBreakdown.length ||
    guide.conductSteps.length ||
    guide.rubricMappingTips.length ||
    guide.commonMistakes.length ||
    guide.bestPractices.length ||
    guide.videoUrl
  );
}

/** GET /api/learning/guides */
exports.getGuides = async (req, res, next) => {
  try {
    const includeUnpublished = req.user.role === 'admin' && req.query.includeUnpublished === 'true';

    const filter = includeUnpublished ? {} : { isGuidePublished: true };

    const [templates, usageCounts] = await Promise.all([
      ActivityTemplate.find(filter).lean(),
      Activity.aggregate([
        { $group: { _id: '$activityType', usageCount: { $sum: 1 } } },
      ]),
    ]);

    const usageMap = new Map(usageCounts.map((row) => [row._id, row.usageCount]));

    const guides = templates
      .map((template) => {
        const guide = normalizeLearningGuide(template);
        return {
          templateId: template._id,
          activityType: template.activityType,
          description: template.description || '',
          isGuidePublished: !!template.isGuidePublished,
          guidePriority: Number(template.guidePriority) || 100,
          usageCount: usageMap.get(template.activityType) || 0,
          guide,
          updatedAt: template.guideLastUpdatedAt || template.updatedAt,
        };
      })
      .filter((item) => hasGuideContent(item.guide));

    guides.sort((a, b) => {
      if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
      if (a.guidePriority !== b.guidePriority) return a.guidePriority - b.guidePriority;
      return a.activityType.localeCompare(b.activityType);
    });

    res.json({ success: true, guides });
  } catch (err) {
    next(err);
  }
};

/** GET /api/learning/guides/:activityType */
exports.getGuideByActivityType = async (req, res, next) => {
  try {
    const rawType = decodeURIComponent(req.params.activityType || '').trim();
    if (!rawType) {
      return res.status(400).json({ success: false, message: 'activityType is required.' });
    }

    const typeRegex = new RegExp(`^${escapeRegex(rawType)}$`, 'i');
    const template = await ActivityTemplate.findOne({ activityType: typeRegex }).lean();

    if (!template) {
      return res.status(404).json({ success: false, message: 'Learning guide not found for this activity type.' });
    }

    if (!template.isGuidePublished && req.user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Learning guide not found for this activity type.' });
    }

    const guide = normalizeLearningGuide(template);
    if (!hasGuideContent(guide)) {
      return res.status(404).json({ success: false, message: 'Learning guide not found for this activity type.' });
    }

    const usageCount = await Activity.countDocuments({ activityType: typeRegex });

    res.json({
      success: true,
      guide: {
        templateId: template._id,
        activityType: template.activityType,
        description: template.description || '',
        isGuidePublished: !!template.isGuidePublished,
        guidePriority: Number(template.guidePriority) || 100,
        usageCount,
        guide,
        updatedAt: template.guideLastUpdatedAt || template.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/learning/guides/view */
exports.markGuideView = async (req, res, next) => {
  try {
    const rawType = typeof req.body?.activityType === 'string' ? req.body.activityType.trim() : '';

    audit.log({
      req,
      action: 'LEARNING_GUIDE_VIEW',
      entityType: 'System',
      entityId: null,
      description: rawType ? `Learning guide viewed: ${rawType}` : 'Learning guide viewed',
      newValue: rawType ? { activityType: rawType } : undefined,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
