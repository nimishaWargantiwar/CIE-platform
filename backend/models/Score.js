// ==========================================
// Score Model — Per-student, per-rubric score
// ==========================================

const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    rubric: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ActivityRubric',
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Unique score per student per rubric per activity
scoreSchema.index({ activity: 1, student: 1, rubric: 1 }, { unique: true });
scoreSchema.index({ activity: 1, student: 1 });

module.exports = mongoose.model('Score', scoreSchema);
