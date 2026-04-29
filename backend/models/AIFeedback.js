// ==========================================
// AI Feedback — Per-student feedback
// ==========================================

const mongoose = require('mongoose');

const aiFeedbackSchema = new mongoose.Schema(
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
    feedback: {
      type: String,
      required: true,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

aiFeedbackSchema.index({ activity: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('AIFeedback', aiFeedbackSchema);
