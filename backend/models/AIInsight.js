// ==========================================
// AI Insight — Class-level weakness analysis
// ==========================================

const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    insights: {
      type: String,
      required: true,
    },
    weakAreas: [
      {
        rubricName: String,
        avgScore: Number,
        suggestion: String,
      },
    ],
    strongAreas: [
      {
        rubricName: String,
        avgScore: Number,
        suggestion: String,
      },
    ],
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

aiInsightSchema.index({ activity: 1 });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
