// ==========================================
// Faculty Rubric Library — Reusable rubrics
// ==========================================

const mongoose = require('mongoose');

const facultyRubricLibrarySchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activityType: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Rubric name is required'],
      trim: true,
    },
    criteria: {
      scale1: { type: String, default: '' },
      scale2: { type: String, default: '' },
      scale3: { type: String, default: '' },
      scale4: { type: String, default: '' },
      scale5: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

facultyRubricLibrarySchema.index({ faculty: 1, activityType: 1 });

module.exports = mongoose.model('FacultyRubricLibrary', facultyRubricLibrarySchema);
