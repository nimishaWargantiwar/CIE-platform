// ==========================================
// Startup Config Validator
// ==========================================
// Validates all required environment variables at boot time
// to fail fast instead of crashing mid-request.

const logger = require('../services/logger');

const REQUIRED_VARS = [
  { key: 'MONGO_URI', description: 'MongoDB connection string' },
  { key: 'JWT_SECRET', description: 'JWT signing secret' },
];

const RECOMMENDED_VARS = [
  { key: 'NODE_ENV', description: 'Runtime environment', default: 'development' },
  { key: 'JWT_EXPIRE', description: 'JWT expiry duration', default: '7d' },
];

const SECURITY_CHECKS = [
  {
    check: (env) => env.JWT_SECRET && env.JWT_SECRET !== 'dev_secret_key' && env.JWT_SECRET.length >= 32,
    message: 'JWT_SECRET should be at least 32 characters and not the default dev key',
    level: 'warn', // warn in dev, error in prod
  },
  {
    check: (env) => env.ADMIN_PASSWORD && env.ADMIN_PASSWORD !== 'Admin@123',
    message: 'ADMIN_PASSWORD should be changed from default',
    level: 'warn',
  },
  {
    check: (env) => env.NODE_ENV !== 'production' || (env.CORS_ORIGIN && env.CORS_ORIGIN !== '*'),
    message: 'CORS_ORIGIN should not be wildcard (*) in production',
    level: 'warn',
  },
];

/**
 * Validate environment configuration at startup.
 * Throws in production for critical missing vars.
 * Warns in development.
 */
function validateConfig() {
  const env = process.env;
  const errors = [];
  const warnings = [];

  // Check required vars
  for (const { key, description } of REQUIRED_VARS) {
    if (!env[key]) {
      errors.push(`Missing required env var: ${key} (${description})`);
    }
  }

  // Check recommended vars
  for (const { key, description, default: defaultVal } of RECOMMENDED_VARS) {
    if (!env[key]) {
      warnings.push(`Missing recommended env var: ${key} (${description}), using default: ${defaultVal}`);
    }
  }

  // Security checks
  const isProduction = env.NODE_ENV === 'production';
  for (const { check, message, level } of SECURITY_CHECKS) {
    if (!check(env)) {
      if (isProduction && level === 'warn') {
        // Elevate warnings to errors in production
        errors.push(`SECURITY: ${message}`);
      } else {
        warnings.push(`SECURITY: ${message}`);
      }
    }
  }

  // Log results
  if (warnings.length > 0) {
    warnings.forEach((w) => logger.warn(`⚠️  Config: ${w}`));
  }

  if (errors.length > 0) {
    errors.forEach((e) => logger.error(`❌ Config: ${e}`));
    if (isProduction) {
      throw new Error(`Configuration validation failed with ${errors.length} error(s). Fix before deploying to production.`);
    }
  }

  logger.info('✅ Configuration validated', {
    environment: env.NODE_ENV || 'development',
    warnings: warnings.length,
    errors: errors.length,
  });
}

module.exports = { validateConfig };
