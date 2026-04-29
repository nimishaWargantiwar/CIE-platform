// ==========================================
// AI Service — Production-Hardened
// ==========================================
// OpenAI / Gemini / Groq abstraction with:
// - Retry logic with exponential backoff
// - Timeout protection
// - Token limit enforcement
// - JSON output validation & fallback
// - Structured prompt templates
// - Usage logging

const OpenAI = require('openai');
const logger = require('./logger');
const {
  AI_PROVIDER,
  OPENAI_API_KEY,
  OPENAI_MODEL,
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_BASE_URL,
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_BASE_URL,
  AI_TIMEOUT_MS,
  AI_MAX_RETRIES,
  AI_MAX_TOKENS,
} = require('../config/env');

// ---- Provider Client Initialization ----

let openaiClient = null;
if (OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  });
}

let geminiClient = null;
if (GEMINI_API_KEY) {
  geminiClient = new OpenAI({
    apiKey: GEMINI_API_KEY,
    baseURL: GEMINI_BASE_URL,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  });
}

let groqClient = null;
if (GROQ_API_KEY) {
  groqClient = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: GROQ_BASE_URL,
    timeout: AI_TIMEOUT_MS,
    maxRetries: 0,
  });
}

// ---- Core Chat Completion with Retry & Timeout ----

async function chatCompletion(systemPrompt, userPrompt, options = {}) {
  const maxTokens = options.maxTokens || AI_MAX_TOKENS;
  const temperature = options.temperature || 0.7;
  const maxRetries = AI_MAX_RETRIES;

  const providerMap = {
    gemini: { client: geminiClient, model: GEMINI_MODEL },
    groq: { client: groqClient, model: GROQ_MODEL },
    openai: { client: openaiClient, model: OPENAI_MODEL },
  };
  const { client, model } = providerMap[AI_PROVIDER] || providerMap.openai;

  if (!client) {
    throw Object.assign(
      new Error(`AI provider "${AI_PROVIDER}" not configured. Set API key in environment.`),
      { statusCode: 503 }
    );
  }

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000);
        logger.info(`AI retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      const startTime = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await client.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
        },
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      const content = response.choices?.[0]?.message?.content;
      const usage = response.usage;

      logger.info('AI completion', {
        provider: AI_PROVIDER,
        model,
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
        durationMs: elapsed,
        attempt: attempt + 1,
      });

      if (!content || content.trim().length === 0) {
        throw new Error('AI returned empty response');
      }

      return content;
    } catch (err) {
      lastError = err;
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        logger.error('AI non-retryable error', { status: err.status, message: err.message });
        break;
      }
      if (err.name === 'AbortError') {
        lastError = Object.assign(new Error('AI request timed out'), { statusCode: 504 });
      }
      logger.warn('AI attempt failed', { attempt: attempt + 1, error: err.message });
    }
  }

  throw Object.assign(
    new Error(`AI service unavailable after ${maxRetries + 1} attempts: ${lastError?.message}`),
    { statusCode: 502 }
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- 1. Auto Rubric Generator ----

async function generateRubrics(activityType, topic) {
  const system = `You are an expert academic evaluation rubric designer for engineering colleges.
IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, no text before or after.
Each object must have exactly: "name" (string) and "criteria" (object with keys scale1-scale5).`;
  const user = `Generate rubrics for activity type "${activityType}" on topic "${topic}".
Return a JSON array where each rubric object has:
{
  "name": "Rubric Title",
  "criteria": {
    "scale1": "Description for score 1 (Poor)",
    "scale2": "Description for score 2 (Below Average)",
    "scale3": "Description for score 3 (Average)",
    "scale4": "Description for score 4 (Good)",
    "scale5": "Description for score 5 (Excellent)"
  }
}
Generate 4-6 rubrics appropriate for the activity type. Be specific and academic.`;

  const raw = await chatCompletion(system, user);
  const fallback = [{
    name: 'Content Quality',
    criteria: { scale1: 'Poor understanding', scale2: 'Below average', scale3: 'Average', scale4: 'Good depth', scale5: 'Excellent mastery' },
  }];

  return parseJSON(raw, validateRubricArray, fallback);
}

// ---- 2. Auto Guidelines Generator ----

async function generateGuidelines(activityType, topic) {
  const system = `You are an academic activity planning expert for engineering colleges.
Provide clear, structured guidelines. Return formatted text (no JSON).`;
  const user = `Generate structured conduction guidelines for a "${activityType}" activity on topic "${topic}".
Include:
1. Objective
2. Pre-requisites for students
3. Activity procedure (step-by-step)
4. Time allocation
5. Evaluation criteria summary
6. Expected outcomes
Format as clean structured text.`;

  return chatCompletion(system, user);
}

// ---- 3. Student Feedback Generator ----

async function generateStudentFeedback(studentName, rubricScores) {
  const system = `You are an academic feedback writer. Write constructive, encouraging feedback.
Keep it concise (3-4 sentences). Be professional and specific.`;
  const scoresText = rubricScores
    .map((r) => `${r.rubricName}: ${r.score}/5`)
    .join('\n');
  const user = `Generate a short academic feedback paragraph (3-4 sentences) for student "${studentName}" based on these rubric scores:
${scoresText}
Highlight strengths and areas for improvement. Be professional and constructive.`;

  return chatCompletion(system, user, { maxTokens: 500 });
}

// ---- 4. Class Weakness Insight ----

async function generateClassInsights(activityName, rubricAverages) {
  const system = `You are an academic analytics expert. Analyze rubric performance data.
IMPORTANT: Return ONLY valid JSON. No markdown fences, no explanation text.`;
  const avgText = rubricAverages
    .map((r) => `${r.rubricName}: avg ${r.avgScore.toFixed(2)}/5`)
    .join('\n');
  const user = `Analyze the class performance for activity "${activityName}":
${avgText}

Return JSON:
{
  "insights": "Overall narrative summary...",
  "weakAreas": [
    { "rubricName": "...", "avgScore": X.XX, "suggestion": "..." }
  ],
  "strongAreas": [
    { "rubricName": "...", "avgScore": X.XX, "suggestion": "..." }
  ]
}
Return ONLY valid JSON.`;

  const raw = await chatCompletion(system, user);
  const fallback = {
    insights: `Class performance analysis for "${activityName}" — please review rubric averages manually.`,
    weakAreas: rubricAverages.filter((r) => r.avgScore < 3.0).map((r) => ({
      rubricName: r.rubricName, avgScore: r.avgScore,
      suggestion: `Focus on improving ${r.rubricName} through targeted practice.`,
    })),
    strongAreas: rubricAverages.filter((r) => r.avgScore >= 4.0).map((r) => ({
      rubricName: r.rubricName,
      avgScore: r.avgScore,
      suggestion: `Maintain and reinforce this strength in ${r.rubricName} through advanced practice.`,
    })),
  };
  return parseJSON(raw, validateInsightsObject, fallback);
}

// ---- 5. NAAC/NBA Report Generator ----

async function generateNAACReport(subjectData) {
  const system = `You are an accreditation report writer for NAAC/NBA for Indian engineering colleges.
IMPORTANT: Return ONLY valid JSON with exactly these 8 keys:
activitiesConducted, rubrics, evaluationMethod, scoreDistribution, observations, weaknessAnalysis, improvementActions, outcomeNarrative.
All values must be strings. No markdown fences.`;
  const user = `Generate a comprehensive NAAC/NBA format report for:
Subject: ${subjectData.subjectName} (${subjectData.subjectCode})
Faculty: ${subjectData.facultyName}
Class: ${subjectData.className}
Academic Year: ${subjectData.academicYear}

Activities conducted:
${subjectData.activities.map((a) => `- ${a.name} (${a.activityType}): ${a.totalMarks} marks, ${a.rubricCount} rubrics`).join('\n')}

Score statistics:
- Total students: ${subjectData.totalStudents}
- Average final score (out of 15): ${subjectData.avgFinal}
- Score distribution: ${JSON.stringify(subjectData.distribution)}

Return ONLY valid JSON with these keys:
{
  "activitiesConducted": "...",
  "rubrics": "...",
  "evaluationMethod": "...",
  "scoreDistribution": "...",
  "observations": "...",
  "weaknessAnalysis": "...",
  "improvementActions": "...",
  "outcomeNarrative": "..."
}`;

  const raw = await chatCompletion(system, user, { maxTokens: 4000 });
  const fallback = {
    activitiesConducted: `${subjectData.activities.length} activities conducted for ${subjectData.subjectName}.`,
    rubrics: 'Rubric-based evaluation with 1-5 scale criteria.',
    evaluationMethod: 'Continuous Internal Evaluation using structured rubrics.',
    scoreDistribution: JSON.stringify(subjectData.distribution),
    observations: `Average score: ${subjectData.avgFinal}/15 across ${subjectData.totalStudents} students.`,
    weaknessAnalysis: 'Detailed analysis pending manual review.',
    improvementActions: 'Review low-scoring rubric areas for targeted improvement.',
    outcomeNarrative: `CIE completed for ${subjectData.subjectName} (${subjectData.academicYear}).`,
  };
  return parseJSON(raw, validateReportObject, fallback);
}

// ---- Safe JSON Parser with Validation ----

function parseJSON(raw, validator, fallback) {
  try {
    let cleaned = raw.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (jsonMatch) cleaned = jsonMatch[1];
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    const parsed = JSON.parse(cleaned);
    if (validator && !validator(parsed)) {
      logger.warn('AI JSON validation failed', { raw: raw.substring(0, 200) });
      if (fallback !== undefined) return fallback;
      throw new Error('AI response did not match expected structure');
    }
    return parsed;
  } catch (err) {
    logger.warn('AI JSON parse error', { error: err.message, raw: raw.substring(0, 300) });
    if (fallback !== undefined) return fallback;
    throw Object.assign(new Error('AI returned invalid JSON. Please try again.'), { statusCode: 502 });
  }
}

// ---- Structure Validators ----

function validateRubricArray(data) {
  if (!Array.isArray(data)) return false;
  return data.every(r => r.name && typeof r.name === 'string' && r.criteria && typeof r.criteria === 'object');
}

function validateInsightsObject(data) {
  return data
    && typeof data.insights === 'string'
    && Array.isArray(data.weakAreas)
    && (typeof data.strongAreas === 'undefined' || Array.isArray(data.strongAreas));
}

function validateReportObject(data) {
  return data && typeof data === 'object' && typeof data.activitiesConducted === 'string';
}

module.exports = {
  generateRubrics,
  generateGuidelines,
  generateStudentFeedback,
  generateClassInsights,
  generateNAACReport,
};
