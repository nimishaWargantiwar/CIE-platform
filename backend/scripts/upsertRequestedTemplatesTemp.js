const mongoose = require('mongoose');
const { MONGO_URI } = require('../config/env');
const ActivityTemplate = require('../models/ActivityTemplate');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const now = new Date();
const templates = [
  {
    activityType: 'Debate',
    description: 'Structured argument activity to evaluate reasoning, evidence, rebuttal, and communication.',
    guidelines: 'Assign stance, prep evidence, conduct moderated rounds, and close with reflection.',
    isGuidePublished: true,
    guidePriority: 95,
    learningGuide: {
      objective: 'Develop analytical thinking, public speaking, and evidence-based argumentation.',
      outcomes: [
        'Build coherent claims supported by technical evidence',
        'Respond to counterarguments with clarity',
      ],
      preparationChecklist: [
        'Assign proposition and teams',
        'Provide rubric and timing rules',
      ],
      timingBreakdown: [
        { phase: 'Opening statements', durationMinutes: 6 },
        { phase: 'Arguments and rebuttals', durationMinutes: 12 },
        { phase: 'Closing and peer questions', durationMinutes: 7 },
      ],
      conductSteps: [
        { title: 'Opening', durationMinutes: 6, details: ['Each side presents core position'] },
        { title: 'Rebuttal', durationMinutes: 12, details: ['Teams challenge assumptions and evidence'] },
        { title: 'Closure', durationMinutes: 7, details: ['Conclude and reflect on strongest argument'] },
      ],
      rubricMappingTips: [
        'Score argument quality and evidence separately',
        'Reward concise and respectful communication',
      ],
      commonMistakes: [
        'Opinion without evidence',
        'Ignoring opponent core claim',
      ],
      bestPractices: [
        'Use technical references and examples',
        'Keep rebuttals specific and time-bound',
      ],
      videoUrl: '',
    },
    defaultRubrics: [
      {
        name: 'Argument Quality',
        criteria: {
          scale1: 'Weak or unclear claims',
          scale2: 'Basic claims with limited logic',
          scale3: 'Reasonable claims with partial logic',
          scale4: 'Strong claims with clear structure',
          scale5: 'Exceptional, rigorous, and coherent argument',
        },
      },
      {
        name: 'Evidence and Rebuttal',
        criteria: {
          scale1: 'No evidence and no rebuttal',
          scale2: 'Minimal evidence with weak rebuttal',
          scale3: 'Adequate evidence with partial rebuttal',
          scale4: 'Strong evidence and clear rebuttal',
          scale5: 'Compelling evidence and incisive rebuttal',
        },
      },
    ],
  },
  {
    activityType: 'Mini Design Challenge',
    description: 'Short team-based design sprint to solve a practical engineering problem under constraints.',
    guidelines: 'Define problem constraints, ideate alternatives, justify chosen design, and present prototype.',
    isGuidePublished: true,
    guidePriority: 96,
    learningGuide: {
      objective: 'Apply engineering design process for constrained real-world problem solving.',
      outcomes: [
        'Translate requirements into feasible design decisions',
        'Justify trade-offs across performance, cost, and safety',
      ],
      preparationChecklist: [
        'Provide problem brief and constraints',
        'Share expected deliverables and rubric',
      ],
      timingBreakdown: [
        { phase: 'Problem analysis', durationMinutes: 8 },
        { phase: 'Ideation and selection', durationMinutes: 12 },
        { phase: 'Prototype and pitch', durationMinutes: 10 },
      ],
      conductSteps: [
        { title: 'Understand constraints', durationMinutes: 8, details: ['Clarify requirements and assumptions'] },
        { title: 'Design alternatives', durationMinutes: 12, details: ['Generate and compare options'] },
        { title: 'Build and present', durationMinutes: 10, details: ['Present prototype and rationale'] },
      ],
      rubricMappingTips: [
        'Assess process and outcome separately',
        'Reward evidence-backed trade-off decisions',
      ],
      commonMistakes: [
        'Skipping requirement analysis',
        'Unjustified final design choice',
      ],
      bestPractices: [
        'Use simple decision matrix for options',
        'Validate assumptions before final pitch',
      ],
      videoUrl: '',
    },
    defaultRubrics: [
      {
        name: 'Design Thinking',
        criteria: {
          scale1: 'No clear approach',
          scale2: 'Limited approach with gaps',
          scale3: 'Structured approach with some gaps',
          scale4: 'Well-structured design process',
          scale5: 'Outstanding design reasoning and process',
        },
      },
      {
        name: 'Feasibility and Communication',
        criteria: {
          scale1: 'Infeasible and unclear presentation',
          scale2: 'Partially feasible with weak communication',
          scale3: 'Reasonably feasible and understandable',
          scale4: 'Feasible with clear technical communication',
          scale5: 'Highly feasible with excellent articulation',
        },
      },
    ],
  },
];

async function run() {
  await mongoose.connect(MONGO_URI);

  for (const template of templates) {
    const typeRegex = new RegExp(`^${escapeRegex(template.activityType)}$`, 'i');
    await ActivityTemplate.findOneAndUpdate(
      { activityType: typeRegex },
      {
        $set: {
          ...template,
          guideLastUpdatedAt: now,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
  }

  const rows = await ActivityTemplate.find({
    activityType: { $in: ['Debate', 'Mini Design Challenge'] },
  })
    .select('activityType description guidePriority isGuidePublished')
    .lean();

  console.log(JSON.stringify(rows, null, 2));
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
