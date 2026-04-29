// ==========================================
// AI Report — NAAC/NBA report generation
// ==========================================

const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema(
  {
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
    reportType: {
      type: String,
      enum: ['NAAC', 'NBA', 'General'],
      default: 'General',
    },
    content: {
      activitiesConducted: { type: String, default: '' },
      rubrics: { type: String, default: '' },
      evaluationMethod: { type: String, default: '' },
      scoreDistribution: { type: String, default: '' },
      observations: { type: String, default: '' },
      weaknessAnalysis: { type: String, default: '' },
      improvementActions: { type: String, default: '' },
      outcomeNarrative: { type: String, default: '' },
    },
    rawContent: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

aiReportSchema.index({ subject: 1, faculty: 1 });

module.exports = mongoose.model('AIReport', aiReportSchema);
