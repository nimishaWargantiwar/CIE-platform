// ==========================================
// Activity Model — Faculty-created CIE activity
// ==========================================

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Activity name is required'],
      trim: true,
      // e.g. "CIE-1", "CIE-2"
    },
    activityType: {
      type: String,
      required: [true, 'Activity type is required'],
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalMarks: {
      type: Number,
      required: [true, 'Total marks is required'],
      min: 0.5,
    },
    topic: {
      type: String,
      default: '',
      trim: true,
    },
    guidelines: {
      type: String,
      default: '',
    },
    videoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'locked'],
      default: 'draft',
    },
    submittedAt: {
      type: Date,
    },
    lockedAt: {
      type: Date,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

activitySchema.index({ subject: 1, faculty: 1 });

module.exports = mongoose.model('Activity', activitySchema);
