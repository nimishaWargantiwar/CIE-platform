// ==========================================
// Winston Logger — Centralized structured logging
// ==========================================
// Production-grade logging with file rotation,
// JSON format for log aggregation, and console output for dev.

const winston = require('winston');
const path = require('path');
const { NODE_ENV } = require('../config/env');

const logDir = path.join(__dirname, '..', 'logs');

// Custom format: timestamp + level + message + metadata
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const transports = [
  // Error log — errors only
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    format: logFormat,
  }),
  // Combined log — all levels
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    level: 'info',
    maxsize: 10 * 1024 * 1024,
    maxFiles: 10,
    format: logFormat,
  }),
];

// Console output in dev/staging
if (NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
    })
  );
} else {
  // In production, still log warnings+ to console for Docker logs
  transports.push(
    new winston.transports.Console({
      level: 'warn',
      format: logFormat,
    })
  );
}

const logger = winston.createLogger({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'pict-cie-api' },
  transports,
  // Don't crash on logging failures
  exitOnError: false,
});

// Morgan stream for HTTP request logging
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
