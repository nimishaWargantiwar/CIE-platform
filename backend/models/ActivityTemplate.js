// ==========================================
// Activity Template — Admin-defined rubric templates
// ==========================================

const mongoose = require('mongoose');

const templateRubricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  criteria: {
    scale1: { type: String, default: '' },
    scale2: { type: String, default: '' },
    scale3: { type: String, default: '' },
    scale4: { type: String, default: '' },
    scale5: { type: String, default: '' },
  },
});

const guideTimingBlockSchema = new mongoose.Schema(
  {
    phase: {
      type: String,
      trim: true,
      default: '',
    },
    durationMinutes: {
      type: Number,
      min: 1,
      max: 600,
      default: 5,
    },
  },
  { _id: false }
);

const guideStepSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    durationMinutes: {
      type: Number,
      min: 1,
      max: 600,
    },
    details: [{ type: String, trim: true }],
  },
  { _id: false }
);

const learningGuideSchema = new mongoose.Schema(
  {
    objective: {
      type: String,
      default: '',
      trim: true,
    },
    outcomes: [{ type: String, trim: true }],
    preparationChecklist: [{ type: String, trim: true }],
    timingBreakdown: [guideTimingBlockSchema],
    conductSteps: [guideStepSchema],
    rubricMappingTips: [{ type: String, trim: true }],
    commonMistakes: [{ type: String, trim: true }],
    bestPractices: [{ type: String, trim: true }],
    videoUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const activityTemplateSchema = new mongoose.Schema(
  {
    activityType: {
      type: String,
      required: [true, 'Activity type is required'],
      trim: true,
      // e.g. "PPT", "Flip Classroom", "GD", "Viva", "Lab"
    },
    description: {
      type: String,
      default: '',
    },
    defaultRubrics: [templateRubricSchema],
    guidelines: {
      type: String,
      default: '',
    },
    learningGuide: {
      type: learningGuideSchema,
      default: () => ({}),
    },
    isGuidePublished: {
      type: Boolean,
      default: false,
    },
    guidePriority: {
      type: Number,
      min: 1,
      max: 9999,
      default: 100,
    },
    guideLastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    guideLastUpdatedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

activityTemplateSchema.index({ activityType: 1 }, { unique: true });

module.exports = mongoose.model('ActivityTemplate', activityTemplateSchema);
