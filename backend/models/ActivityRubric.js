// ==========================================
// Activity Rubric — Rubrics for a specific activity
// ==========================================

const mongoose = require('mongoose');

const activityRubricSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Rubric name is required'],
      trim: true,
    },
    criteria: {
      scale1: { type: String, default: 'Poor' },
      scale2: { type: String, default: 'Below Average' },
      scale3: { type: String, default: 'Average' },
      scale4: { type: String, default: 'Good' },
      scale5: { type: String, default: 'Excellent' },
    },
    order: {
      type: Number,
      default: 0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

activityRubricSchema.index({ activity: 1, order: 1 });

module.exports = mongoose.model('ActivityRubric', activityRubricSchema);
