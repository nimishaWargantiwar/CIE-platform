# Claude Prompt For Full Project Report (No Code Access Mode)

Use this when Claude does not have direct repository access.
This prompt includes a full evidence bundle, so Claude can still generate a detailed technical report.

## Prompt To Copy Into Claude

```text
You are a senior software architect, technical auditor, and engineering documentation specialist.

You do NOT have direct access to the repository code.
You MUST generate a complete, detailed project report using ONLY the "Repository Evidence Bundle" provided below.

Rules:
1. Treat the evidence bundle as the source of truth.
2. Do not ask for additional files.
3. If a point is uncertain, state an assumption explicitly.
4. Do not expose any secrets. Redact keys/tokens/passwords if mentioned.
5. Be concrete and implementation-aware.
6. Where possible, cite evidence IDs (for example: [E7], [E12]) for every major claim.

============================================================
REPOSITORY EVIDENCE BUNDLE
============================================================

[E1] Project identity
- Name: PICT Smart CIE Evaluation Platform
- Repository root: CIE-PLATFORM
- Domain: Continuous Internal Evaluation (CIE) for engineering colleges
- Maturity summary from docs: feature-complete MVP+/production-ready with known gaps in automated testing and CI

[E2] High-level architecture
- Stack: MERN (MongoDB, Express, React, Node.js)
- Backend: Express API + Mongoose + JWT auth + Zod validation + middleware for security/rate limits/sanitization
- Frontend: React 18 + Vite + Tailwind + AG Grid
- Infra: Docker Compose (MongoDB, backend, frontend) + Nginx reverse proxy

[E3] Backend runtime wiring (from server entry)
- Middleware: helmet, cors, express.json/urlencoded, custom sanitize, morgan to Winston, global API limiter
- Route mounts:
  - /api/auth
  - /api/academic-years
  - /api/classes
  - /api/subjects
  - /api/students
  - /api/activities
  - /api/rubrics
  - /api/scores
  - /api/exports
  - /api/ai
  - /api/admin
  - /api/learning
  - /api/quiz
- Health endpoint: /api/health with DB and memory status
- Startup behavior: config validation, DB connect, admin sync, index verification
- Shutdown behavior: graceful close + forced timeout

[E4] Backend package details
- backend/package.json
- Scripts:
  - start: node server.js
  - dev: nodemon server.js
  - seed: node utils/seed.js
  - backfill:gd-video: node scripts/backfillGdVideoUrl.js
- Core deps include:
  - express, mongoose, zod, jsonwebtoken, bcryptjs, helmet, cors, express-rate-limit, multer, exceljs, pdfkit, openai, winston

[E5] Backend module inventory
- Controllers (13):
  - academicYearController.js
  - activityController.js
  - adminController.js
  - aiController.js
  - authController.js
  - classController.js
  - exportController.js
  - learningController.js
  - quizController.js
  - rubricController.js
  - scoreController.js
  - studentController.js
  - subjectController.js
- Middleware (8):
  - activityAccess.js, auth.js, errorHandler.js, rateLimiter.js, roleCheck.js, sanitize.js, upload.js, validate.js
- Services (7):
  - aiService.js, auditService.js, excelService.js, logger.js, pdfService.js, quizEvaluationEngine.js, scoringEngine.js
- Models (18):
  - AcademicYear, Activity, ActivityRubric, ActivityTemplate, AIFeedback, AIInsight, AIReport, AuditLog,
    Class, FacultyRubricLibrary, FinalSubjectResult, QuizAttemptToken, QuizQuestion, QuizSubmission,
    Score, Student, Subject, User

[E6] Backend route inventory summary
- Route files: 13
- Declared endpoints count: 84
- Route files:
  - academicYears.js
  - activities.js
  - admin.js
  - ai.js
  - auth.js
  - classes.js
  - exports.js
  - learning.js
  - quiz.js
  - rubrics.js
  - scores.js
  - students.js
  - subjects.js

[E7] Endpoint declarations by route file
- academicYears.js
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id
- activities.js
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id
  - POST /:id/submit
  - POST /:id/lock
  - POST /:id/unlock
- admin.js
  - GET /users
  - PUT /users/:id
  - GET /faculty
  - GET /templates
  - POST /templates
  - PUT /templates/:id
  - DELETE /templates/:id
  - GET /stats
  - GET /all-activities
  - GET /system-status
  - GET /audit-logs
- ai.js
  - POST /generate-rubrics
  - POST /generate-guidelines
  - POST /student-feedback
  - POST /class-insights
  - POST /naac-report
  - GET /feedback/:activityId
  - GET /insights/:activityId
  - GET /report/:subjectId
- auth.js
  - POST /login
  - POST /refresh
  - POST /register
  - GET /me
  - PUT /password
- classes.js
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id
- exports.js
  - GET /subject/:subjectId/excel
  - GET /subject/:subjectId/report-pdf
- learning.js
  - GET /guides
  - GET /guides/:activityType
- quiz.js
  - GET /questions/:activityId
  - POST /questions
  - PUT /questions/:questionId
  - DELETE /questions/:questionId
  - PUT /questions/reorder/:activityId
  - POST /generate-link
  - GET /tokens/:activityId
  - PATCH /tokens/:tokenId/deactivate
  - GET /submissions/:activityId
  - GET /submissions/detail/:submissionId
  - PATCH /submissions/:submissionId/override
  - POST /sync-cie/:activityId
  - POST /sync-cie/single/:submissionId
  - GET /attempt/:token (public)
  - POST /attempt/:token/submit (public)
- rubrics.js
  - GET /activity/:activityId
  - POST /
  - PUT /:id
  - DELETE /:id
  - GET /library
  - POST /library
  - DELETE /library/:id
  - POST /library/:id/apply
- scores.js
  - GET /activity/:activityId
  - POST /bulk
  - GET /subject/:subjectId/final
  - POST /subject/:subjectId/recompute
- students.js
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id
  - POST /import
- subjects.js
  - GET /
  - GET /:id
  - POST /
  - PUT /:id
  - DELETE /:id

[E8] Frontend package details
- frontend/package.json
- Scripts:
  - dev: vite
  - build: vite build
  - preview: vite preview
- Core deps include:
  - react, react-dom, react-router-dom, axios, ag-grid-react, ag-grid-community, react-hot-toast, react-markdown, react-icons

[E9] Frontend inventory
- Page files count: 17
- Pages:
  - AcademicYearsPage.jsx
  - ActivitiesPage.jsx
  - ActivityDetailPage.jsx
  - AIToolsPage.jsx
  - ClassesPage.jsx
  - DashboardPage.jsx
  - GradingPage.jsx
  - LearningCenterPage.jsx
  - LoginPage.jsx
  - QuizAttemptPage.jsx
  - QuizBuilderPage.jsx
  - QuizResultsPage.jsx
  - ResultsPage.jsx
  - StudentsPage.jsx
  - SubjectsPage.jsx
  - TemplatesPage.jsx
  - UsersPage.jsx
- Components:
  - ConductionGuidelines.jsx
  - Modal.jsx
  - RubricEditor.jsx

[E10] Frontend route map (App.jsx)
- Public:
  - /login
  - /quiz/attempt/:token
- Protected under main layout:
  - /
  - /academic-years (admin only)
  - /classes (admin only)
  - /subjects
  - /students (admin only)
  - /activities
  - /activities/:id
  - /grading/:activityId
  - /results/:subjectId
  - /ai-tools
  - /learning
  - /users (admin only)
  - /templates (admin only)
  - /quiz/builder/:activityId
  - /quiz/results/:activityId

[E11] Functional scope from requirements/docs
- Roles: admin and faculty
- Academic structure: academic year -> class -> subject -> assigned faculty
- Student import via Excel and CRUD
- Activity lifecycle: draft -> submitted -> locked -> unlock
- Rubric model: rubric name + scale1..scale5 criteria
- Grading: rubric score capture and final normalization out of 15
- Export: Excel and PDF
- AI features (5): rubric generation, guidelines, student feedback, class insights, NAAC/NBA report
- Template system: admin-defined activity templates with default rubrics and guide content
- Audit system: user actions and operational events

[E12] Security and reliability controls observed
- JWT auth middleware + role checks
- Zod request validation middleware
- Rate limiter middleware (global API + stricter AI limiter + quiz attempt/submit limiters)
- Helmet and CORS
- Mongo sanitization middleware
- Centralized error handler
- Winston logging service and log files
- Graceful shutdown path in server

[E13] AI provider architecture and runtime notes
- aiService provider abstraction supports openai, gemini, and groq
- Retry logic with backoff and timeout exists for AI completion calls
- Historical runtime issue observed: Gemini API returned repeated 429 RESOURCE_EXHAUSTED due to quota limits
- Runtime switch validated: Groq key test succeeded and aiService call succeeded with provider=groq
- Frontend AI error messaging was improved to surface quota/config issues instead of generic failure

[E14] Deployment and environment
- Docker artifacts present: docker-compose.yml, docker-compose.prod.yml, backend Dockerfile, frontend Dockerfile
- Nginx config present in nginx/default.conf and frontend/nginx.conf
- Backend env templates: .env.example and .env.production.example
- Hosting guide available in HOSTING.md

[E15] Documentation set available
- README.md
- REQUIREMENTS.md
- FUNCTIONALITY.md
- IMPLEMENTATION_STATUS.md
- IMPLEMENTATION_LOGBOOK.md
- COMMANDS.md
- HOSTING.md

[E16] Known gaps or risks explicitly noted in docs/session
- Automated tests not present (unit/integration/e2e coverage gap)
- CI workflow definitions not observed
- Environment sample docs still emphasize Gemini even though runtime supports Groq
- Audit log write warning observed in runtime logs for LOGIN_SUCCESS when user field missing

[E17] Selected recent implementation changes from active session
- Activity type dropdown in activities page was changed from hardcoded list to template/guide-driven dynamic list
- Activities card iframe video preview removed in requested section
- AI tools page error handling updated to show meaningful provider/quota messages
- New templates inserted into DB: Debate and Mini Design Challenge

============================================================
TASK
============================================================

Using ONLY the evidence bundle above, generate a complete technical report in markdown.

Required output sections (exact headings):
1. Executive Summary
2. Product Scope And Stakeholders
3. Functional Coverage Matrix
4. System Architecture
5. Backend Deep Dive
6. Data Model And Persistence
7. Frontend Deep Dive
8. AI Module Assessment
9. Security Review
10. Reliability And Observability
11. Deployment And Environment
12. Performance And Scalability
13. Testing And Quality Status
14. Technical Debt And Risks
15. Actionable Roadmap (30/60/90 day)
16. Appendix

Formatting requirements:
- Include at least one Mermaid diagram in Section 4.
- Include one table each in Sections 3, 9, and 14.
- In each section, cite evidence IDs like [E3], [E10].
- Add an "Assumptions" sub-section where evidence is incomplete.
- End with: "Go-live readiness verdict" and explicit conditions.

Output file target name (in your response): PROJECT_DETAILED_REPORT.md

Start now.
```

## Optional Second Prompt (After Main Report)

```text
Using the generated report, produce two additional artifacts:
1) MANAGEMENT_SUMMARY.md (max 2 pages, non-technical, decision-focused)
2) ENGINEERING_ACTION_PLAN.md (ticket-style tasks with severity, owner role, estimate, dependency)
```
