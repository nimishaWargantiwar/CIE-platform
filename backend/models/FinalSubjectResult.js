// ==========================================
// Final Subject Result — Cached final scores
// ==========================================

const mongoose = require('mongoose');

const finalSubjectResultSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    rawTotal: {
      type: Number,
      default: 0,
    },
    maxPossible: {
      type: Number,
      default: 0,
    },
    finalOutOf15: {
      type: Number,
      default: 0,
    },
    activityBreakdown: [
      {
        activity: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' },
        activityName: String,
        score: Number,
        totalMarks: Number,
      },
    ],
  },
  { timestamps: true }
);

finalSubjectResultSchema.index({ subject: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('FinalSubjectResult', finalSubjectResultSchema);
