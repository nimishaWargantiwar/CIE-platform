// ==========================================
// Seed Script — Create Initial Admin User
// ==========================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const config = require('../config/env');

// Inline model to avoid import issues
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'faculty'], default: 'faculty' },
    department: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('✅ Connected.');

    const adminEmail = config.adminEmail || 'admin@pict.edu';
    const adminPassword = config.adminPassword || 'Admin@123';

    const existing = await User.findOne({ email: adminEmail });
    if (existing) {
      console.log(`⚠️  Admin user already exists: ${adminEmail}`);
    } else {
      const salt = await bcrypt.genSalt(12);
      const hashed = await bcrypt.hash(adminPassword, salt);

      await User.create({
        name: 'Platform Admin',
        email: adminEmail,
        password: hashed,
        role: 'admin',
        department: 'Administration',
        isActive: true,
      });

      console.log(`✅ Admin user created: ${adminEmail}`);
    }

    await mongoose.disconnect();
    console.log('🌱 Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();
