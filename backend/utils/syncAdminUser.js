const bcrypt = require('bcryptjs');
const User = require('../models/User');
const logger = require('../services/logger');
const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../config/env');

async function syncAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    logger.warn('Admin sync skipped: ADMIN_EMAIL or ADMIN_PASSWORD missing');
    return;
  }

  const existing = await User.findOne({ email: ADMIN_EMAIL }).select('+password');

  if (!existing) {
    await User.create({
      name: 'Platform Admin',
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: 'admin',
      department: 'Administration',
      isActive: true,
    });

    logger.info('Admin sync: created admin user from environment');
    return;
  }

  const updates = {};
  if (existing.role !== 'admin') updates.role = 'admin';
  if (!existing.isActive) updates.isActive = true;

  const samePassword = await bcrypt.compare(ADMIN_PASSWORD, existing.password);
  if (!samePassword) {
    existing.password = ADMIN_PASSWORD;
  }

  if (Object.keys(updates).length > 0) {
    Object.assign(existing, updates);
  }

  if (!samePassword || Object.keys(updates).length > 0) {
    await existing.save();
    logger.info('Admin sync: updated admin credentials/role from environment');
  } else {
    logger.info('Admin sync: admin user already in sync');
  }
}

module.exports = { syncAdminUser };
