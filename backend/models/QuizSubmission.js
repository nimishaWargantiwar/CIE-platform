// ==========================================
// QuizSubmission Model — Student quiz attempt records
// ==========================================
// Stores per-student answers, auto-graded scores,
// and links back to the activity for CIE integration.

const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizQuestion',
      required: true,
    },
    // Student's answer
    answerText: {
      type: String,
      default: '',
      trim: true,
    },
    // For MCQ: selected option ID(s)
    selectedOptions: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    // Auto-graded score for this question
    awardedMarks: {
      type: Number,
      default: 0,
    },
    maxMarks: {
      type: Number,
      default: 0,
    },
    // Evaluation details
    isCorrect: {
      type: Boolean,
      default: false,
    },
    evaluationNote: {
      type: String,
      default: '',
    },
    // Faculty can override auto-graded score
    facultyOverride: {
      type: Number,
      default: null,
    },
  },
  { _id: true }
);

const quizSubmissionSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizAttemptToken',
      required: true,
    },
    // Student identification (quiz can be taken without login)
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    // Answers
    answers: {
      type: [answerSchema],
      default: [],
    },
    // Aggregate scores
    totalMarksObtained: {
      type: Number,
      default: 0,
    },
    totalMarksPossible: {
      type: Number,
      default: 0,
    },
    percentageScore: {
      type: Number,
      default: 0,
    },
    // Status
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'evaluated', 'reviewed'],
      default: 'submitted',
    },
    // Whether scores have been synced to CIE Score model
    cieSynced: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    attemptStartedAt: {
      type: Date,
      default: null,
    },
    submissionDurationSeconds: {
      type: Number,
      default: null,
      min: 0,
    },
    evaluatedAt: {
      type: Date,
    },
    // IP tracking for security
    ipAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Prevent duplicate submissions per student per activity (unless multiple attempts allowed)
quizSubmissionSchema.index({ activity: 1, rollNo: 1 });
quizSubmissionSchema.index({ token: 1 });
quizSubmissionSchema.index({ activity: 1, status: 1 });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
