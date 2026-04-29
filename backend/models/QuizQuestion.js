// ==========================================
// QuizQuestion Model — Questions for quiz-type activities
// ==========================================
// Supports MCQ, Short Answer, and Descriptive question types.
// Linked to an Activity (activityType = 'Quiz').

const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: true,
    },
    questionType: {
      type: String,
      enum: ['mcq', 'short', 'descriptive'],
      required: [true, 'Question type is required'],
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    // MCQ options (only for mcq type)
    options: {
      type: [optionSchema],
      default: [],
    },
    // Expected answer for short-answer type (keywords, comma-separated)
    expectedAnswer: {
      type: String,
      default: '',
      trim: true,
    },
    // Marks for this question
    marks: {
      type: Number,
      required: [true, 'Marks for question is required'],
      min: 1,
    },
    // Allow partial scoring for short/descriptive
    allowPartialScoring: {
      type: Boolean,
      default: false,
    },
    // Order in the quiz
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

quizQuestionSchema.index({ activity: 1, order: 1 });

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
