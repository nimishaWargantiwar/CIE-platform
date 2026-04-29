// ==========================================
// MongoDB Index Ensurer
// ==========================================
// Ensures all performance-critical indexes exist.
// Called once at startup after DB connection.
// Indexes defined in models via .index() are auto-created by Mongoose,
// but this file adds compound/partial indexes for query optimization.

const mongoose = require('mongoose');
const logger = require('../services/logger');

/**
 * Ensure all production indexes are created.
 * Mongoose auto-creates indexes from schema definitions,
 * but we verify and log them here for operational visibility.
 */
async function ensureIndexes() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      logger.warn('Database not ready for index verification');
      return;
    }

    // Sync all model indexes defined in schemas
    const models = mongoose.modelNames();
    for (const modelName of models) {
      try {
        await mongoose.model(modelName).syncIndexes();
      } catch (err) {
        logger.warn(`Index sync warning for ${modelName}: ${err.message}`);
      }
    }

    // Additional performance indexes not in schema definitions
    const additionalIndexes = [
      // Scores: fast lookup for grading grid
      {
        collection: 'scores',
        index: { activity: 1, rubric: 1 },
        options: { name: 'scores_activity_rubric', background: true },
      },
      // Activities: filter by status for admin dashboard
      {
        collection: 'activities',
        index: { status: 1, createdAt: -1 },
        options: { name: 'activities_status_date', background: true },
      },
      // Students: fast class listing
      {
        collection: 'students',
        index: { class: 1, academicYear: 1, rollNo: 1 },
        options: { name: 'students_class_year_roll', background: true },
      },
      // Final results: fast subject summary
      {
        collection: 'finalsubjectresults',
        index: { subject: 1, finalOutOf15: -1 },
        options: { name: 'results_subject_score', background: true },
      },
      // Audit logs: efficient querying
      {
        collection: 'auditlogs',
        index: { action: 1, entityType: 1, createdAt: -1 },
        options: { name: 'audit_action_entity_date', background: true },
      },
    ];

    for (const { collection, index, options } of additionalIndexes) {
      try {
        const col = db.collection(collection);
        await col.createIndex(index, options);
      } catch (err) {
        // Index may already exist with different options — safe to ignore
        if (err.code !== 85 && err.code !== 86) {
          logger.warn(`Additional index creation warning on ${collection}: ${err.message}`);
        }
      }
    }

    logger.info('✅ MongoDB indexes verified', { modelCount: models.length });
  } catch (err) {
    logger.error('Index verification error', { error: err.message });
    // Non-fatal — app can still run with slower queries
  }
}

module.exports = { ensureIndexes };
