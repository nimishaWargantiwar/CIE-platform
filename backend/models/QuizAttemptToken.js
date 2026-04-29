// ==========================================
// QuizAttemptToken Model — Secure quiz access tokens
// ==========================================
// Generates unique, tokenized links for quiz access.
// Faculty generates the link; students use it to attempt.

const mongoose = require('mongoose');
const crypto = require('node:crypto');

const quizAttemptTokenSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Token configuration
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null = no expiry
    },
    maxAttempts: {
      type: Number,
      default: 1, // 0 = unlimited
    },
    allowMultipleAttempts: {
      type: Boolean,
      default: false,
    },
    // Tracking
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalUses: {
      type: Number,
      default: 0,
    },
    activeAttemptRollNos: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

// Generate a secure random token
quizAttemptTokenSchema.statics.generateToken = function () {
  return crypto.randomBytes(32).toString('hex');
};

// Check if token is valid
quizAttemptTokenSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  return true;
};

quizAttemptTokenSchema.index({ activity: 1 });
quizAttemptTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('QuizAttemptToken', quizAttemptTokenSchema);
