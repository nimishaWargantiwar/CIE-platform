// ==========================================
// Mock Data Seeder — Populates DB with realistic test data
// ==========================================
// Run: node mockdata/seedMockData.js
// Reset: node mockdata/seedMockData.js --reset

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const config = require('../config/env');

// Import all models
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const ActivityTemplate = require('../models/ActivityTemplate');
const Score = require('../models/Score');
const FinalSubjectResult = require('../models/FinalSubjectResult');

// ==========================================
// Mock Data Definitions
// ==========================================

const FACULTY = [
  { name: 'Dr. Priya Sharma', email: 'priya.sharma@pict.edu', department: 'Computer Engineering' },
  { name: 'Prof. Rajesh Deshmukh', email: 'rajesh.deshmukh@pict.edu', department: 'Computer Engineering' },
  { name: 'Dr. Anita Kulkarni', email: 'anita.kulkarni@pict.edu', department: 'Computer Engineering' },
];

const STUDENTS_TE_A = [
  { rollNo: 'TE31001', name: 'Aarav Patil' },
  { rollNo: 'TE31002', name: 'Sneha Joshi' },
  { rollNo: 'TE31003', name: 'Rohit Mehta' },
  { rollNo: 'TE31004', name: 'Priya Desai' },
  { rollNo: 'TE31005', name: 'Amit Kulkarni' },
  { rollNo: 'TE31006', name: 'Neha Wagh' },
  { rollNo: 'TE31007', name: 'Vikram Singh' },
  { rollNo: 'TE31008', name: 'Pooja Bhosale' },
  { rollNo: 'TE31009', name: 'Saurabh Gaikwad' },
  { rollNo: 'TE31010', name: 'Ankita Chavan' },
  { rollNo: 'TE31011', name: 'Rahul Jadhav' },
  { rollNo: 'TE31012', name: 'Divya Pawar' },
  { rollNo: 'TE31013', name: 'Kunal Shinde' },
  { rollNo: 'TE31014', name: 'Shruti Mane' },
  { rollNo: 'TE31015', name: 'Aditya Kale' },
];

const STUDENTS_TE_B = [
  { rollNo: 'TE32001', name: 'Manish Thakur' },
  { rollNo: 'TE32002', name: 'Riya Patel' },
  { rollNo: 'TE32003', name: 'Deepak Jain' },
  { rollNo: 'TE32004', name: 'Swati Ghorpade' },
  { rollNo: 'TE32005', name: 'Nikhil Rane' },
  { rollNo: 'TE32006', name: 'Tanvi Bhat' },
  { rollNo: 'TE32007', name: 'Omkar Deshpande' },
  { rollNo: 'TE32008', name: 'Kajal Sawant' },
  { rollNo: 'TE32009', name: 'Vishal Londhe' },
  { rollNo: 'TE32010', name: 'Aditi Nair' },
];

const TEMPLATES = [
  {
    activityType: 'PPT',
    description: 'PowerPoint presentation with Q&A',
    guidelines: 'Students present a topic with slides (10-15 slides, 8-12 min). Conduct Q&A for 2-3 min after each presentation.',
    defaultRubrics: [
      {
        name: 'Content Depth',
        criteria: {
          scale1: 'No research, copied content',
          scale2: 'Superficial content, lacks depth',
          scale3: 'Adequate content coverage',
          scale4: 'Well-researched with good examples',
          scale5: 'Exceptional depth, original insights',
        },
      },
      {
        name: 'Slide Design',
        criteria: {
          scale1: 'Text-heavy, no visuals',
          scale2: 'Poor layout, inconsistent',
          scale3: 'Clean layout, some visuals',
          scale4: 'Professional design with charts/diagrams',
          scale5: 'Outstanding visual storytelling',
        },
      },
      {
        name: 'Delivery & Communication',
        criteria: {
          scale1: 'Reads from slides, no eye contact',
          scale2: 'Mostly reads, poor delivery',
          scale3: 'Decent delivery, some confidence',
          scale4: 'Confident, clear communication',
          scale5: 'Engaging speaker, excellent command',
        },
      },
      {
        name: 'Q&A Handling',
        criteria: {
          scale1: 'Cannot answer any questions',
          scale2: 'Struggles with basic questions',
          scale3: 'Answers some questions adequately',
          scale4: 'Handles most questions well',
          scale5: 'Expert-level responses, handles all questions',
        },
      },
    ],
  },
  {
    activityType: 'GD',
    description: 'Group Discussion on technical/current topics',
    guidelines: 'Groups of 6-10 students discuss a topic for 12-15 min. Evaluate individual participation, not group performance.',
    learningGuide: {
      videoUrl: 'https://youtu.be/69JpdGqM3NM',
    },
    defaultRubrics: [
      {
        name: 'Content & Relevance',
        criteria: {
          scale1: 'Off-topic, no substance',
          scale2: 'Barely relevant points',
          scale3: 'Relevant but surface-level',
          scale4: 'Strong, well-supported arguments',
          scale5: 'Outstanding insights with data/examples',
        },
      },
      {
        name: 'Communication Clarity',
        criteria: {
          scale1: 'Incoherent, cannot express ideas',
          scale2: 'Unclear, struggles to articulate',
          scale3: 'Clear enough to be understood',
          scale4: 'Articulate and persuasive',
          scale5: 'Exceptionally eloquent and compelling',
        },
      },
      {
        name: 'Listening & Teamwork',
        criteria: {
          scale1: 'Interrupts, ignores others',
          scale2: 'Poor listener, dominates',
          scale3: 'Listens sometimes, contributes fairly',
          scale4: 'Good listener, builds on others\' points',
          scale5: 'Excellent team player, facilitates discussion',
        },
      },
    ],
  },
  {
    activityType: 'Viva',
    description: 'Oral examination on subject topics',
    guidelines: 'Individual viva of 5-10 min per student. Start with basics, progress to application-level questions.',
    defaultRubrics: [
      {
        name: 'Conceptual Clarity',
        criteria: {
          scale1: 'No understanding of basics',
          scale2: 'Vague understanding, many gaps',
          scale3: 'Knows basics, some gaps',
          scale4: 'Strong understanding with applications',
          scale5: 'Mastery-level, explains with examples',
        },
      },
      {
        name: 'Depth of Knowledge',
        criteria: {
          scale1: 'Cannot go beyond definitions',
          scale2: 'Shallow responses only',
          scale3: 'Moderate depth on most topics',
          scale4: 'Deep understanding, handles follow-ups',
          scale5: 'Expert depth, connects across topics',
        },
      },
      {
        name: 'Confidence & Articulation',
        criteria: {
          scale1: 'Extremely nervous, cannot speak',
          scale2: 'Hesitant, struggles to explain',
          scale3: 'Reasonable confidence',
          scale4: 'Confident with clear explanations',
          scale5: 'Poised, professional, and articulate',
        },
      },
    ],
  },
];

const ACTIVITIES_DSAL = [
  {
    name: 'PPT: Sorting Algorithms',
    activityType: 'PPT',
    totalMarks: 10,
    topic: 'Comparison of Sorting Algorithms',
    guidelines: 'Present analysis of at least 3 sorting algorithms with time complexity comparison.',
  },
  {
    name: 'GD: AI in Software Engineering',
    activityType: 'GD',
    totalMarks: 10,
    topic: 'Impact of AI on Software Development',
    guidelines: 'Discuss pros, cons, and future of AI in software engineering.',
    videoUrl: 'https://youtu.be/69JpdGqM3NM',
  },
  {
    name: 'Viva: Trees & Graphs',
    activityType: 'Viva',
    totalMarks: 10,
    topic: 'Tree and Graph Data Structures',
    guidelines: 'Questions on BST, AVL, BFS, DFS, shortest path algorithms.',
  },
];

const ACTIVITIES_OOP = [
  {
    name: 'PPT: Design Patterns',
    activityType: 'PPT',
    totalMarks: 10,
    topic: 'Object-Oriented Design Patterns',
    guidelines: 'Present at least 3 design patterns with code examples.',
  },
  {
    name: 'Viva: OOP Concepts',
    activityType: 'Viva',
    totalMarks: 10,
    topic: 'Core OOP Principles',
    guidelines: 'Questions on encapsulation, inheritance, polymorphism, abstraction, SOLID.',
  },
];

// ==========================================
// Seed Functions
// ==========================================

async function resetMockData() {
  console.log('🗑️  Removing all mock data...');
  // Remove in reverse dependency order
  await FinalSubjectResult.deleteMany({});
  await Score.deleteMany({});
  await ActivityRubric.deleteMany({});
  await Activity.deleteMany({});
  await ActivityTemplate.deleteMany({});
  await Student.deleteMany({});
  await Subject.deleteMany({});
  await Class.deleteMany({});
  await AcademicYear.deleteMany({});
  // Remove mock faculty only (not admin)
  await User.deleteMany({ role: 'faculty' });
  console.log('✅ All mock data removed.');
}

function randomScore() {
  // Weighted toward 3-5 for realistic distribution
  const weights = [0.05, 0.10, 0.25, 0.35, 0.25]; // scores 1-5
  const r = Math.random();
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (r <= sum) return i + 1;
  }
  return 3;
}

async function seedMockData() {
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    console.error('❌ Admin user not found. Run "node utils/seed.js" first.');
    process.exit(1);
  }

  // --- 1. Faculty Users ---
  console.log('👥 Creating faculty users...');

  const facultyDocs = [];
  for (const f of FACULTY) {
    const exists = await User.findOne({ email: f.email });
    if (exists) {
      facultyDocs.push(exists);
    } else {
      // Pass plain password — User model pre-save hook will hash it
      const user = await User.create({
        ...f,
        password: 'Faculty@123',
        role: 'faculty',
        isActive: true,
      });
      facultyDocs.push(user);
    }
  }
  console.log(`   ✅ ${facultyDocs.length} faculty ready`);

  // --- 2. Academic Years ---
  console.log('📅 Creating academic years...');
  let ay2025 = await AcademicYear.findOne({ name: '2025-26' });
  if (!ay2025) {
    ay2025 = await AcademicYear.create({
      name: '2025-26',
      startDate: new Date('2025-07-01'),
      endDate: new Date('2026-06-30'),
      isActive: true,
    });
  }
  let ay2024 = await AcademicYear.findOne({ name: '2024-25' });
  if (!ay2024) {
    ay2024 = await AcademicYear.create({
      name: '2024-25',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2025-06-30'),
      isActive: false,
    });
  }
  console.log('   ✅ Academic years: 2024-25, 2025-26');

  // --- 3. Classes ---
  console.log('🏫 Creating classes...');
  let teCompA = await Class.findOne({ name: 'TE COMP A', academicYear: ay2025._id });
  if (!teCompA) {
    teCompA = await Class.create({ name: 'TE COMP A', academicYear: ay2025._id, department: 'Computer Engineering' });
  }
  let teCompB = await Class.findOne({ name: 'TE COMP B', academicYear: ay2025._id });
  if (!teCompB) {
    teCompB = await Class.create({ name: 'TE COMP B', academicYear: ay2025._id, department: 'Computer Engineering' });
  }
  let seComp = await Class.findOne({ name: 'SE COMP', academicYear: ay2024._id });
  if (!seComp) {
    seComp = await Class.create({ name: 'SE COMP', academicYear: ay2024._id, department: 'Computer Engineering' });
  }
  console.log('   ✅ Classes: TE COMP A, TE COMP B (2025-26), SE COMP (2024-25)');

  // --- 4. Subjects ---
  console.log('📚 Creating subjects...');
  let dsal = await Subject.findOne({ code: 'CS301', class: teCompA._id, academicYear: ay2025._id });
  if (!dsal) {
    dsal = await Subject.create({
      name: 'Data Structures & Algorithms',
      code: 'CS301',
      class: teCompA._id,
      academicYear: ay2025._id,
      faculty: facultyDocs[0]._id,
    });
  }
  let oop = await Subject.findOne({ code: 'CS302', class: teCompA._id, academicYear: ay2025._id });
  if (!oop) {
    oop = await Subject.create({
      name: 'Object Oriented Programming',
      code: 'CS302',
      class: teCompA._id,
      academicYear: ay2025._id,
      faculty: facultyDocs[1]._id,
    });
  }
  let dbms = await Subject.findOne({ code: 'CS303', class: teCompB._id, academicYear: ay2025._id });
  if (!dbms) {
    dbms = await Subject.create({
      name: 'Database Management Systems',
      code: 'CS303',
      class: teCompB._id,
      academicYear: ay2025._id,
      faculty: facultyDocs[2]._id,
    });
  }
  console.log('   ✅ Subjects: DSAL, OOP (TE COMP A), DBMS (TE COMP B)');

  // --- 5. Students ---
  console.log('🎓 Creating students...');
  const studentsA = [];
  for (const s of STUDENTS_TE_A) {
    let student = await Student.findOne({ rollNo: s.rollNo, class: teCompA._id, academicYear: ay2025._id });
    if (!student) {
      student = await Student.create({ ...s, class: teCompA._id, academicYear: ay2025._id });
    }
    studentsA.push(student);
  }
  const studentsB = [];
  for (const s of STUDENTS_TE_B) {
    let student = await Student.findOne({ rollNo: s.rollNo, class: teCompB._id, academicYear: ay2025._id });
    if (!student) {
      student = await Student.create({ ...s, class: teCompB._id, academicYear: ay2025._id });
    }
    studentsB.push(student);
  }
  console.log(`   ✅ Students: ${studentsA.length} in TE COMP A, ${studentsB.length} in TE COMP B`);

  // --- 6. Activity Templates ---
  console.log('📋 Creating activity templates...');
  for (const t of TEMPLATES) {
    const exists = await ActivityTemplate.findOne({ activityType: t.activityType });
    if (!exists) {
      await ActivityTemplate.create({ ...t, createdBy: adminUser._id });
    }
  }
  console.log(`   ✅ Templates: PPT, GD, Viva`);

  // --- 7. Activities + Rubrics for DSAL ---
  console.log('📝 Creating DSAL activities with rubrics...');
  const dsalActivities = [];
  for (const actDef of ACTIVITIES_DSAL) {
    let activity = await Activity.findOne({ name: actDef.name, subject: dsal._id });
    if (!activity) {
      activity = await Activity.create({
        ...actDef,
        subject: dsal._id,
        faculty: facultyDocs[0]._id,
        status: 'draft',
      });
      // Copy rubrics from template
      const template = TEMPLATES.find((t) => t.activityType === actDef.activityType);
      if (template) {
        const rubricDocs = template.defaultRubrics.map((r, idx) => ({
          activity: activity._id,
          name: r.name,
          criteria: r.criteria,
          order: idx,
        }));
        await ActivityRubric.insertMany(rubricDocs);
      }
    }
    dsalActivities.push(activity);
  }
  console.log(`   ✅ DSAL: ${dsalActivities.length} activities with rubrics`);

  // --- 8. Activities + Rubrics for OOP ---
  console.log('📝 Creating OOP activities with rubrics...');
  const oopActivities = [];
  for (const actDef of ACTIVITIES_OOP) {
    let activity = await Activity.findOne({ name: actDef.name, subject: oop._id });
    if (!activity) {
      activity = await Activity.create({
        ...actDef,
        subject: oop._id,
        faculty: facultyDocs[1]._id,
        status: 'draft',
      });
      const template = TEMPLATES.find((t) => t.activityType === actDef.activityType);
      if (template) {
        const rubricDocs = template.defaultRubrics.map((r, idx) => ({
          activity: activity._id,
          name: r.name,
          criteria: r.criteria,
          order: idx,
        }));
        await ActivityRubric.insertMany(rubricDocs);
      }
    }
    oopActivities.push(activity);
  }
  console.log(`   ✅ OOP: ${oopActivities.length} activities with rubrics`);

  // --- 9. Generate Scores for DSAL (first activity fully graded) ---
  console.log('📊 Generating scores for DSAL PPT activity...');
  const dsalAct1 = dsalActivities[0];
  const dsalAct1Rubrics = await ActivityRubric.find({ activity: dsalAct1._id }).sort('order');

  let scoreCount = 0;
  for (const student of studentsA) {
    for (const rubric of dsalAct1Rubrics) {
      const exists = await Score.findOne({
        activity: dsalAct1._id,
        student: student._id,
        rubric: rubric._id,
      });
      if (!exists) {
        await Score.create({
          activity: dsalAct1._id,
          student: student._id,
          rubric: rubric._id,
          score: randomScore(),
          gradedBy: facultyDocs[0]._id,
        });
        scoreCount++;
      }
    }
  }
  console.log(`   ✅ ${scoreCount} scores created for "${dsalAct1.name}"`);

  // Also grade second DSAL activity (GD)
  console.log('📊 Generating scores for DSAL GD activity...');
  const dsalAct2 = dsalActivities[1];
  const dsalAct2Rubrics = await ActivityRubric.find({ activity: dsalAct2._id }).sort('order');

  scoreCount = 0;
  for (const student of studentsA) {
    for (const rubric of dsalAct2Rubrics) {
      const exists = await Score.findOne({
        activity: dsalAct2._id,
        student: student._id,
        rubric: rubric._id,
      });
      if (!exists) {
        await Score.create({
          activity: dsalAct2._id,
          student: student._id,
          rubric: rubric._id,
          score: randomScore(),
          gradedBy: facultyDocs[0]._id,
        });
        scoreCount++;
      }
    }
  }
  console.log(`   ✅ ${scoreCount} scores created for "${dsalAct2.name}"`);

  // --- 10. Compute Final Results for DSAL ---
  console.log('🧮 Computing final results for DSAL...');
  const { recomputeSubjectResults } = require('../services/scoringEngine');
  const studentIds = studentsA.map((s) => s._id);
  const results = await recomputeSubjectResults(dsal._id, studentIds);
  console.log(`   ✅ ${results.length} final results computed (out of /15)`);

  // --- 11. Submit the first DSAL activity to show locked rubrics ---
  console.log('🔒 Submitting first DSAL activity...');
  dsalAct1.status = 'submitted';
  dsalAct1.submittedAt = new Date();
  await dsalAct1.save();
  await ActivityRubric.updateMany({ activity: dsalAct1._id }, { isLocked: true });
  console.log('   ✅ PPT: Sorting Algorithms → submitted (rubrics locked)');

  // --- Summary ---
  console.log('\n' + '='.repeat(50));
  console.log('🎉 MOCK DATA SEEDED SUCCESSFULLY!');
  console.log('='.repeat(50));
  console.log('\n📋 Summary:');
  console.log('   Academic Years: 2024-25, 2025-26');
  console.log('   Classes: TE COMP A, TE COMP B, SE COMP');
  console.log('   Faculty: 3 users (password: Faculty@123)');
  console.log('   Students: 15 (TE COMP A) + 10 (TE COMP B)');
  console.log('   Subjects: DSAL, OOP, DBMS');
  console.log('   Templates: PPT, GD, Viva');
  console.log('   Activities: 3 (DSAL) + 2 (OOP) = 5 total');
  console.log('   Scores: DSAL PPT + GD fully graded (15 students × rubrics)');
  console.log('   Final Results: DSAL computed out of /15');
  console.log('\n🔑 Login credentials:');
  console.log('   Admin:   admin@pict.edu / Admin@123');
  console.log('   Faculty: priya.sharma@pict.edu / Faculty@123');
  console.log('   Faculty: rajesh.deshmukh@pict.edu / Faculty@123');
  console.log('   Faculty: anita.kulkarni@pict.edu / Faculty@123');
  console.log('');
}

// ==========================================
// Main
// ==========================================

async function main() {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(config.MONGO_URI || config.mongoUri);
    console.log('✅ Connected.\n');

    const isReset = process.argv.includes('--reset');

    if (isReset) {
      await resetMockData();
    } else {
      await seedMockData();
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
