// ==========================================
// Input Validation Middleware — Zod Schemas
// ==========================================
// Centralized request validation using Zod.
// Each route can use validate(schemaName) middleware.

const { z } = require('zod');

// ---- Reusable Primitives ----

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format');
const email = z.string().email('Invalid email format').toLowerCase().trim();
const password = z.string().min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/(?=.*[a-z])/, 'Password must contain a lowercase letter')
  .regex(/(?=.*[A-Z])/, 'Password must contain an uppercase letter')
  .regex(/(?=.*\d)/, 'Password must contain a digit');
const trimStr = z.string().trim();
const positiveInt = z.number().int().positive();
const guideItem = trimStr.min(2).max(500);

function isYouTubeUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(`${videoId}`.trim());
  } catch {
    return false;
  }
}

const youtubeUrlField = z.string().trim()
  .refine((value) => value === '' || isYouTubeUrl(value), 'Video URL must be a valid YouTube link');

const learningGuideSchema = z.object({
  objective: trimStr.max(2000).optional().default(''),
  outcomes: z.array(guideItem).max(20).optional().default([]),
  preparationChecklist: z.array(guideItem).max(30).optional().default([]),
  timingBreakdown: z.array(
    z.object({
      phase: trimStr.min(2).max(120),
      durationMinutes: z.number().int().min(1).max(600),
    })
  ).max(12).optional().default([]),
  conductSteps: z.array(
    z.object({
      title: trimStr.min(2).max(200),
      durationMinutes: z.number().int().min(1).max(600).optional(),
      details: z.array(guideItem).max(20).optional().default([]),
    })
  ).max(20).optional().default([]),
  rubricMappingTips: z.array(guideItem).max(20).optional().default([]),
  commonMistakes: z.array(guideItem).max(20).optional().default([]),
  bestPractices: z.array(guideItem).max(20).optional().default([]),
  videoUrl: youtubeUrlField.optional().default(''),
});

const learningGuideUpdateSchema = z.object({
  objective: trimStr.max(2000).optional(),
  outcomes: z.array(guideItem).max(20).optional(),
  preparationChecklist: z.array(guideItem).max(30).optional(),
  timingBreakdown: z.array(
    z.object({
      phase: trimStr.min(2).max(120),
      durationMinutes: z.number().int().min(1).max(600),
    })
  ).max(12).optional(),
  conductSteps: z.array(
    z.object({
      title: trimStr.min(2).max(200),
      durationMinutes: z.number().int().min(1).max(600).optional(),
      details: z.array(guideItem).max(20).optional(),
    })
  ).max(20).optional(),
  rubricMappingTips: z.array(guideItem).max(20).optional(),
  commonMistakes: z.array(guideItem).max(20).optional(),
  bestPractices: z.array(guideItem).max(20).optional(),
  videoUrl: youtubeUrlField.optional(),
});

// ---- Schema Definitions ----

const schemas = {
  // Auth
  login: z.object({
    body: z.object({
      email: email,
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  register: z.object({
    body: z.object({
      name: trimStr.min(2).max(100),
      email: email,
      password: password,
      role: z.enum(['admin', 'faculty']).default('faculty'),
      department: trimStr.max(100).optional().default(''),
    }),
  }),

  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: password,
    }),
  }),

  // Academic Year
  academicYear: z.object({
    body: z.object({
      name: trimStr.min(3).max(50),
      startDate: z.string().or(z.date()),
      endDate: z.string().or(z.date()),
      isActive: z.boolean().optional(),
    }),
  }),

  // Class
  classCreate: z.object({
    body: z.object({
      name: trimStr.min(2).max(100),
      academicYear: objectId,
      department: trimStr.max(100).optional().default(''),
    }),
  }),

  // Subject
  subjectCreate: z.object({
    body: z.object({
      name: trimStr.min(2).max(150),
      code: trimStr.min(2).max(20).toUpperCase(),
      class: objectId,
      academicYear: objectId,
      faculty: objectId,
    }),
  }),

  // Student
  studentCreate: z.object({
    body: z.object({
      rollNo: trimStr.min(1).max(30),
      name: trimStr.min(2).max(120),
      class: objectId,
      academicYear: objectId,
    }),
  }),

  studentImport: z.object({
    body: z.object({
      classId: objectId,
      academicYearId: objectId,
    }),
  }),

  // Activity
  activityCreate: z.object({
    body: z.object({
      name: trimStr.min(2).max(200),
      activityType: trimStr.min(2).max(100),
      subjectName: trimStr.min(2).max(200),
      classId: objectId,
      academicYearId: objectId,
      totalMarks: z.number().min(0.5).max(1000),
      topic: trimStr.max(500).optional().default(''),
      guidelines: z.string().max(10000).optional().default(''),
      videoUrl: youtubeUrlField.optional().default(''),
    }),
  }),

  activityUpdate: z.object({
    body: z.object({
      name: trimStr.min(2).max(200).optional(),
      totalMarks: z.number().min(0.5).max(1000).optional(),
      topic: trimStr.max(500).optional(),
      guidelines: z.string().max(10000).optional(),
      videoUrl: youtubeUrlField.optional(),
    }),
  }),

  // Rubric
  rubricCreate: z.object({
    body: z.object({
      activity: objectId,
      name: trimStr.min(2).max(200),
      criteria: z.object({
        scale1: z.string().max(500).default(''),
        scale2: z.string().max(500).default(''),
        scale3: z.string().max(500).default(''),
        scale4: z.string().max(500).default(''),
        scale5: z.string().max(500).default(''),
      }),
      order: z.number().int().min(0).optional(),
    }),
  }),

  rubricUpdate: z.object({
    body: z.object({
      name: trimStr.min(2).max(200).optional(),
      criteria: z.object({
        scale1: z.string().max(500).optional(),
        scale2: z.string().max(500).optional(),
        scale3: z.string().max(500).optional(),
        scale4: z.string().max(500).optional(),
        scale5: z.string().max(500).optional(),
      }).optional(),
      order: z.number().int().min(0).optional(),
    }),
  }),

  // Score bulk save
  scoreBulk: z.object({
    body: z.object({
      activityId: objectId,
      scores: z.array(
        z.object({
          studentId: objectId,
          rubricId: objectId,
          score: z.number().int().min(1).max(5),
        })
      ).min(1, 'At least one score is required').max(5000, 'Too many scores in single request'),
    }),
  }),

  // AI requests
  aiGenerateRubrics: z.object({
    body: z.object({
      activityType: trimStr.min(2).max(100),
      topic: trimStr.min(2).max(500),
    }),
  }),

  aiGenerateGuidelines: z.object({
    body: z.object({
      activityType: trimStr.min(2).max(100),
      topic: trimStr.min(2).max(500),
    }),
  }),

  aiStudentFeedback: z.object({
    body: z.object({
      activityId: objectId,
      studentId: objectId,
    }),
  }),

  aiClassInsights: z.object({
    body: z.object({
      activityId: objectId,
    }),
  }),

  aiNAACReport: z.object({
    body: z.object({
      subjectId: objectId,
      reportType: z.enum(['NAAC', 'NBA', 'General']).optional().default('NAAC'),
    }),
  }),

  // Library
  libraryRubric: z.object({
    body: z.object({
      activityType: trimStr.min(2).max(100),
      name: trimStr.min(2).max(200),
      criteria: z.object({
        scale1: z.string().max(500).default(''),
        scale2: z.string().max(500).default(''),
        scale3: z.string().max(500).default(''),
        scale4: z.string().max(500).default(''),
        scale5: z.string().max(500).default(''),
      }),
    }),
  }),

  // Admin template
  templateCreate: z.object({
    body: z.object({
      activityType: trimStr.min(2).max(100),
      description: z.string().max(1000).optional().default(''),
      defaultRubrics: z.array(
        z.object({
          name: trimStr.min(2).max(200),
          criteria: z.object({
            scale1: z.string().max(500).default(''),
            scale2: z.string().max(500).default(''),
            scale3: z.string().max(500).default(''),
            scale4: z.string().max(500).default(''),
            scale5: z.string().max(500).default(''),
          }),
        })
      ).optional().default([]),
      guidelines: z.string().max(10000).optional().default(''),
      learningGuide: learningGuideSchema.optional().default({}),
      isGuidePublished: z.boolean().optional().default(false),
      guidePriority: z.number().int().min(1).max(9999).optional().default(100),
    }),
  }),

  templateUpdate: z.object({
    body: z.object({
      activityType: trimStr.min(2).max(100).optional(),
      description: z.string().max(1000).optional(),
      defaultRubrics: z.array(
        z.object({
          name: trimStr.min(2).max(200),
          criteria: z.object({
            scale1: z.string().max(500).default(''),
            scale2: z.string().max(500).default(''),
            scale3: z.string().max(500).default(''),
            scale4: z.string().max(500).default(''),
            scale5: z.string().max(500).default(''),
          }),
        })
      ).optional(),
      guidelines: z.string().max(10000).optional(),
      learningGuide: learningGuideUpdateSchema.optional(),
      isGuidePublished: z.boolean().optional(),
      guidePriority: z.number().int().min(1).max(9999).optional(),
    }),
  }),

  // Admin user update
  adminUserUpdate: z.object({
    body: z.object({
      name: trimStr.min(2).max(100).optional(),
      email: email.optional(),
      role: z.enum(['admin', 'faculty']).optional(),
      department: trimStr.max(100).optional(),
      isActive: z.boolean().optional(),
    }),
  }),

  adminUserDelete: z.object({
    params: z.object({
      id: objectId,
    }),
  }),

  // Pagination query params
  paginatedQuery: z.object({
    query: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).optional(),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    }).passthrough(),
  }),

  // ---- Quiz Module Schemas ----

  quizQuestionCreate: z.object({
    body: z.object({
      activityId: objectId,
      questionType: z.enum(['mcq', 'short', 'descriptive']),
      questionText: trimStr.min(2).max(5000),
      options: z.array(
        z.object({
          label: trimStr.min(1).max(1000),
          isCorrect: z.boolean().default(false),
        })
      ).optional().default([]),
      expectedAnswer: z.string().max(2000).optional().default(''),
      marks: z.number().min(1).max(1000),
      allowPartialScoring: z.boolean().optional().default(false),
    }),
  }),

  quizGenerateLink: z.object({
    body: z.object({
      activityId: objectId,
      expiresInHours: z.number().min(0.5).max(720).optional(),
      maxAttempts: z.number().int().min(0).max(100).optional().default(1),
      allowMultipleAttempts: z.boolean().optional().default(false),
    }),
  }),

  quizAttemptSubmit: z.object({
    body: z.object({
      rollNo: trimStr.min(1).max(30),
      studentName: trimStr.min(2).max(120),
      attemptStartedAt: z.union([z.string().datetime(), z.date()]).optional(),
      answers: z.array(
        z.object({
          questionId: objectId,
          answerText: z.string().max(10000).optional().default(''),
          selectedOptions: z.array(objectId).optional().default([]),
        })
      ).min(1, 'At least one answer is required'),
    }),
  }),

  quizScoreOverride: z.object({
    body: z.object({
      answerId: z.string().min(1),
      overrideMarks: z.number().min(0).max(1000),
    }),
  }),
};

// ---- Validation Middleware Factory ----

/**
 * Express middleware that validates request against a named Zod schema.
 * @param {string} schemaName — Key in the schemas object above.
 */
function validate(schemaName) {
  const schema = schemas[schemaName];
  if (!schema) {
    throw new Error(`Validation schema "${schemaName}" not found`);
  }

  return (req, res, next) => {
    try {
      const toValidate = {};
      if (schema.shape.body) toValidate.body = req.body;
      if (schema.shape.query) toValidate.query = req.query;
      if (schema.shape.params) toValidate.params = req.params;

      const result = schema.parse(toValidate);

      // Replace request data with parsed (trimmed, transformed) values
      if (result.body) req.body = result.body;
      if (result.query) Object.assign(req.query, result.query);
      if (result.params) Object.assign(req.params, result.params);

      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: messages,
        });
      }
      next(err);
    }
  };
}

module.exports = { validate, schemas };
