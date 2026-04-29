// ==========================================
// Environment Configuration
// ==========================================
// Centralized config with env separation and defaults.

require('dotenv').config();

module.exports = {
  // Core
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/pict_cie',

  // JWT Auth
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev_refresh_secret',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  // AI Provider
  AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
  GEMINI_BASE_URL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS, 10) || 30000,
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES, 10) || 2,
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS, 10) || 3000,

  // Rate Limiting
  AI_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10) || 60000,
  AI_RATE_LIMIT_MAX: parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 20,

  // Admin Seed
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@pict.edu',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // backward-compat aliases used by seed.js
  get mongoUri() { return this.MONGO_URI; },
  get adminEmail() { return this.ADMIN_EMAIL; },
  get adminPassword() { return this.ADMIN_PASSWORD; },
};
