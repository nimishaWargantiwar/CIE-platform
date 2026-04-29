// ==========================================
// Class Model — e.g. "TE COMP A"
// ==========================================

const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      // e.g. "TE COMP A"
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    department: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Unique class name per academic year
classSchema.index({ name: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
