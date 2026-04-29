// One-time utility: ensure GD template has a default reference video URL.
// Run from backend folder: node scripts/backfillGdVideoUrl.js

const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ActivityTemplate = require('../models/ActivityTemplate');

const DEFAULT_GD_VIDEO = 'https://youtu.be/69JpdGqM3NM';

async function run() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set in backend/.env');
  }

  await mongoose.connect(mongoUri);

  const result = await ActivityTemplate.updateOne(
    {
      activityType: { $regex: /^GD$/i },
      $or: [
        { 'learningGuide.videoUrl': { $exists: false } },
        { 'learningGuide.videoUrl': '' },
      ],
    },
    {
      $set: { 'learningGuide.videoUrl': DEFAULT_GD_VIDEO },
    }
  );

  console.log('Matched templates:', result.matchedCount);
  console.log('Modified templates:', result.modifiedCount);

  await mongoose.disconnect();
}

run()
  .then(() => {
    console.log('GD video backfill complete.');
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('Backfill failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch {
      // Ignore disconnect errors during failure handling.
    }
    process.exit(1);
  });
