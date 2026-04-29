// ==========================================
// Student Model — belongs to class + year
// ==========================================

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      maxlength: 120,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
  },
  { timestamps: true }
);

// Unique roll number per class + academic year
studentSchema.index({ rollNo: 1, class: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);
