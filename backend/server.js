// ==========================================
// PICT Smart CIE Evaluation Platform — Server
// ==========================================
// Production-hardened Express server with:
// - Centralized Winston logging
// - MongoDB input sanitization
// - Graceful shutdown
// - Config validation at startup
// - Performance index verification

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const { PORT, NODE_ENV, CORS_ORIGIN } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const mongoSanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const logger = require('./services/logger');
const { validateConfig } = require('./utils/configValidator');
const { syncAdminUser } = require('./utils/syncAdminUser');

// Validate config before anything else
validateConfig();

// Connect to MongoDB
connectDB().then(async () => {
  // Ensure admin credentials from environment are always usable.
  try {
    await syncAdminUser();
  } catch (err) {
    logger.warn('Admin sync skipped', { error: err.message });
  }

  // Ensure indexes after connection is established
  try {
    const { ensureIndexes } = require('./config/indexes');
    await ensureIndexes();
  } catch (err) {
    logger.warn('Index verification skipped', { error: err.message });
  }
});

const app = express();

// ----- Trust proxy (for rate limiter behind Nginx/Docker) -----
app.set('trust proxy', 1);

// ----- Global Middleware -----
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — restrict in production
const corsOptions = {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((s) => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24h preflight cache
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB injection sanitization (defense-in-depth)
app.use(mongoSanitize);

// HTTP request logging via Morgan → Winston
app.use(morgan(
  NODE_ENV === 'production'
    ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
    : 'dev',
  { stream: logger.stream }
));

// Global API rate limiter
app.use('/api', apiLimiter);

// ----- API Routes -----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/academic-years', require('./routes/academicYears'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/students', require('./routes/students'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/rubrics', require('./routes/rubrics'));
app.use('/api/scores', require('./routes/scores'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/learning', require('./routes/learning'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/quiz', require('./routes/quiz'));

// Enhanced health check with DB status
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbState = mongoose.connection.readyState;
  const dbStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

  const healthy = dbState === 1;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    environment: NODE_ENV,
    database: dbStates[dbState] || 'unknown',
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    },
  });
});

// Error handler (must be last)
app.use(errorHandler);

// ----- Start Server -----
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
});

// ----- Graceful Shutdown -----
function gracefulShutdown(signal) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
      logger.info('MongoDB connection closed.');
    } catch (err) {
      logger.error('Error during MongoDB disconnect', { error: err.message });
    }
    process.exit(0);
  });

  // Force shutdown after 15 seconds
  setTimeout(() => {
    logger.error('Forced shutdown — could not close connections in time.');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception — shutting down', { error: err.message, stack: err.stack });
  gracefulShutdown('uncaughtException');
});

module.exports = app;
