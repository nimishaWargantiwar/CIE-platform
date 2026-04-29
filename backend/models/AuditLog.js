// ==========================================
// Audit Log Model — Track critical operations
// ==========================================
// Records rubric edits, activity lock/unlock,
// score changes, user management actions, etc.

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ['admin', 'faculty'],
      required: true,
    },

    // What action was performed
    action: {
      type: String,
      required: true,
      enum: [
        // Activity lifecycle
        'ACTIVITY_CREATE',
        'ACTIVITY_UPDATE',
        'ACTIVITY_DELETE',
        'ACTIVITY_SUBMIT',
        'ACTIVITY_LOCK',
        'ACTIVITY_UNLOCK',
        // Rubric operations
        'RUBRIC_CREATE',
        'RUBRIC_UPDATE',
        'RUBRIC_DELETE',
        // Score operations
        'SCORES_BULK_SAVE',
        'SCORES_RECOMPUTE',
        // User management
        'USER_CREATE',
        'USER_UPDATE',
        'USER_DEACTIVATE',
        'USER_ACTIVATE',
        // Student operations
        'STUDENT_CREATE',
        'STUDENT_DELETE',
        // Template operations
        'TEMPLATE_CREATE',
        'TEMPLATE_DELETE',
        // Data operations
        'STUDENTS_IMPORT',
        'RESULTS_EXPORT',
        'REPORT_EXPORT',
        // AI operations
        'AI_GENERATE_RUBRICS',
        'AI_GENERATE_GUIDELINES',
        'AI_GENERATE_FEEDBACK',
        'AI_GENERATE_INSIGHTS',
        'AI_GENERATE_REPORT',
        // Learning operations
        'LEARNING_GUIDE_VIEW',
        // System
        'PASSWORD_CHANGE',
        'LOGIN_SUCCESS',
        'LOGIN_FAILED',
      ],
      index: true,
    },

    // What entity was affected
    entityType: {
      type: String,
      enum: ['Activity', 'ActivityRubric', 'ActivityTemplate', 'Score', 'User', 'Student', 'Subject', 'AIReport', 'System'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    // Details of the change
    description: {
      type: String,
      default: '',
    },

    // Before/after snapshots for critical changes
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Request metadata
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    // Auto-expire audit logs after 2 years (configurable)
    expireAfterSeconds: undefined,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
