// ==========================================
// Direct Mongo seed: add one CIE + scores for all students
// Usage: node scripts/addCieAndScoresDirectMongo.js [SUBJECT_CODE]
// Default subject code: DSA1
// ==========================================

const mongoose = require('mongoose');
const connectDB = require('../config/db');

// Ensure refs used in populate are registered
require('../models/User');
require('../models/Class');
require('../models/AcademicYear');

const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const Score = require('../models/Score');
const { recomputeSubjectResults } = require('../services/scoringEngine');

function getNextCieName(existingNames) {
  let max = 0;
  existingNames.forEach((name) => {
    const match = `${name || ''}`.trim().match(/^cie\s*(\d+)$/i);
    if (!match) return;
    const num = Number(match[1]);
    if (Number.isFinite(num) && num > max) max = num;
  });
  return `cie ${max + 1}`;
}

async function main() {
  const subjectCode = (process.argv[2] || 'DSA1').trim().toUpperCase();

  await connectDB();

  const subject = await Subject.findOne({ code: subjectCode })
    .populate('faculty', 'name email role')
    .populate('class', 'name')
    .populate('academicYear', 'name')
    .lean();

  if (!subject) {
    throw new Error(`Subject with code ${subjectCode} not found`);
  }

  if (!subject.faculty?._id) {
    throw new Error(`Subject ${subject.name} (${subject.code}) has no faculty assigned`);
  }

  const students = await Student.find({
    class: subject.class?._id || subject.class,
    academicYear: subject.academicYear?._id || subject.academicYear,
  }).sort({ rollNo: 1 }).lean();

  if (students.length === 0) {
    throw new Error(`No students found for class/year of subject ${subject.code}`);
  }

  const existingActivities = await Activity.find({ subject: subject._id }).select('name').lean();
  const activityName = getNextCieName(existingActivities.map((a) => a.name));

  const activity = await Activity.create({
    name: activityName,
    activityType: 'PPT',
    subject: subject._id,
    faculty: subject.faculty._id,
    totalMarks: 5,
    topic: `${subject.name} assessment`,
    guidelines: 'Direct Mongo seeded CIE for full-class scoring.',
    status: 'draft',
  });

  const rubricDefs = [
    {
      name: 'Content Knowledge & Depth',
      criteria: {
        scale1: 'Limited understanding',
        scale2: 'Basic understanding',
        scale3: 'Moderate understanding',
        scale4: 'Good understanding',
        scale5: 'Excellent depth and clarity',
      },
    },
    {
      name: 'Presentation & Communication Skills',
      criteria: {
        scale1: 'Very unclear',
        scale2: 'Partially clear',
        scale3: 'Generally clear',
        scale4: 'Clear and structured',
        scale5: 'Highly articulate and engaging',
      },
    },
    {
      name: 'Slide Design & Visual Aids',
      criteria: {
        scale1: 'Poor visual quality',
        scale2: 'Below average visuals',
        scale3: 'Average design quality',
        scale4: 'Good visuals and readability',
        scale5: 'Excellent visual communication',
      },
    },
    {
      name: 'Q&A Handling & Subject Clarity',
      criteria: {
        scale1: 'Cannot answer key questions',
        scale2: 'Answers with gaps',
        scale3: 'Answers most basic questions',
        scale4: 'Good clarity in responses',
        scale5: 'Confident and conceptually strong responses',
      },
    },
  ];

  const rubrics = await ActivityRubric.insertMany(
    rubricDefs.map((rubric, order) => ({
      activity: activity._id,
      name: rubric.name,
      criteria: rubric.criteria,
      order,
    }))
  );

  const scoreOps = [];
  students.forEach((student, studentIndex) => {
    rubrics.forEach((rubric, rubricIndex) => {
      // Deterministic distribution: scores 3..5
      const score = 3 + ((studentIndex + rubricIndex) % 3);

      scoreOps.push({
        updateOne: {
          filter: {
            activity: activity._id,
            student: student._id,
            rubric: rubric._id,
          },
          update: {
            $set: {
              score,
              gradedBy: subject.faculty._id,
            },
          },
          upsert: true,
        },
      });
    });
  });

  const scoreWriteResult = await Score.bulkWrite(scoreOps, { ordered: false });

  await recomputeSubjectResults(
    subject._id,
    students.map((s) => s._id)
  );

  console.log('--- Direct Mongo seed complete ---');
  console.log(`Subject: ${subject.name} (${subject.code})`);
  console.log(`Faculty: ${subject.faculty.name} <${subject.faculty.email}>`);
  console.log(`Activity created: ${activity.name} [${activity._id}]`);
  console.log(`Students scored: ${students.length}`);
  console.log(`Rubrics created: ${rubrics.length}`);
  console.log(`Score upserts: ${scoreWriteResult.upsertedCount || 0}`);
  console.log(`Score modified: ${scoreWriteResult.modifiedCount || 0}`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(`Seed failed: ${err.message}`);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore disconnect errors
    }
    process.exit(1);
  });
