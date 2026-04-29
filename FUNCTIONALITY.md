# PICT Smart CIE Evaluation Platform — Detailed Functionality Document

> **Version:** 1.0.0  
> **Stack:** MongoDB · Express.js · React 18 · Node.js 20 (MERN)  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [User Roles & Authentication](#2-user-roles--authentication)
3. [Admin Management Module](#3-admin-management-module)
4. [Academic Structure Module](#4-academic-structure-module)
5. [Student Management Module](#5-student-management-module)
6. [Activity & Rubric Engine](#6-activity--rubric-engine)
7. [Grading & Scoring System](#7-grading--scoring-system)
8. [Results & Final Computation](#8-results--final-computation)
9. [Export Module (Excel & PDF)](#9-export-module-excel--pdf)
10. [AI-Powered Tools (5 Features)](#10-ai-powered-tools-5-features)
11. [Template Library System](#11-template-library-system)
12. [Security & Production Hardening](#12-security--production-hardening)
13. [Audit Trail System](#13-audit-trail-system)
14. [API Reference (57 Endpoints)](#14-api-reference-57-endpoints)
15. [Database Schema (15 Models)](#15-database-schema-15-models)
16. [Frontend Pages & Navigation](#16-frontend-pages--navigation)
17. [Deployment Architecture](#17-deployment-architecture)
18. [Configuration Reference](#18-configuration-reference)

---

## 1. Platform Overview

The **PICT Smart CIE (Continuous Internal Evaluation)** platform is a comprehensive evaluation management system designed for engineering colleges. It digitizes the entire CIE workflow — from creating activities and defining rubrics to grading students, computing final results, and generating NAAC/NBA compliance reports.

### Core Capabilities

| Capability | Description |
|-----------|-------------|
| **Role-Based Access Control** | Admin and Faculty roles with granular permissions |
| **Rubric-Based Grading** | 5-point scale rubrics with criteria for each level |
| **AG Grid Spreadsheet** | Real-time, Excel-like grading interface |
| **Automated Score Computation** | Weighted rubric scores → activity marks → final out of 15 |
| **Excel Import/Export** | Bulk student import and results export via `.xlsx` files |
| **PDF Report Generation** | NAAC/NBA compliance reports with statistics |
| **5 AI-Powered Tools** | Rubric generation, guidelines, feedback, insights, and reports using Google Gemini / OpenAI |
| **Activity Templates** | Reusable templates with pre-defined rubrics |
| **Faculty Rubric Library** | Personal library for saving and reusing rubrics |
| **Full Audit Trail** | Tracks every critical operation with user, timestamp, and before/after snapshots |
| **Production Hardened** | Helmet, rate limiting, input sanitization, Zod validation, Winston logging |

---

## 2. User Roles & Authentication

### 2.1 Roles

| Role | Access Level |
|------|-------------|
| **Admin** | Full system access — user management, templates, all subjects, lock/unlock activities, dashboard stats, audit logs, system health |
| **Faculty** | Assigned subjects only — create activities, define rubrics, grade students, view results, use AI tools |

### 2.2 Authentication Flow

```
Login → JWT Access Token (15min) + Refresh Token (7 days)
       ↓
  Every API call attaches: Authorization: Bearer <access_token>
       ↓
  On 401 (expired) → Frontend auto-redirects to /login
       ↓
  Refresh endpoint → New access + refresh token pair
```

**Key Features:**
- **Password Hashing:** bcrypt with salt round 12
- **Token Pair System:** Short-lived access token (15m) + long-lived refresh token (7d)
- **Account Deactivation:** Admin can deactivate accounts (returns 403 on login attempt)
- **Password Change:** Requires current password verification before update
- **Automatic Cleanup:** Frontend clears localStorage on 401 response

### 2.3 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@pict.edu` | `Admin@123` |

Created via `node utils/seed.js` seed script.

---

## 3. Admin Management Module

### 3.1 Dashboard (Admin View)

The admin dashboard displays 4 real-time stat cards:

| Stat | Source |
|------|--------|
| Total Faculty | Count of active faculty users |
| Total Subjects | Count of all subjects |
| Total Students | Count of all students |
| Total Activities | Count of all activities |

Plus:
- **Activity Status Breakdown** — Aggregation of draft / submitted / locked activities
- **Department Stats** — Faculty and subject counts per department
- **My Subjects** — Quick links to subject results
- **Recent Activities** — Latest activities with status badges

### 3.2 User Management (`/users`)

| Feature | Description |
|---------|-------------|
| **User List** | Paginated table with Name, Email, Role (purple=admin, blue=faculty), Department, Active status |
| **Register User** | Modal form: full name, email, password, role (admin/faculty), department |
| **Toggle Active** | One-click activate/deactivate per user |
| **Search & Filter** | Filter by role, department; search by name/email |

### 3.3 System Health (`GET /api/admin/system-health`)

Returns:
- Database connection status
- Memory usage (RSS & heap)
- Server uptime
- Collection document counts
- Node.js version

### 3.4 Audit Log Viewer (`GET /api/admin/audit-logs`)

Queryable audit trail with:
- Filter by action type, entity type, user, date range
- Paginated results (50 per page)
- Before/after snapshots for data changes

---

## 4. Academic Structure Module

### 4.1 Academic Years (`/academic-years`)

Defines the academic calendar periods (e.g., "2025-26").

| Field | Description |
|-------|-------------|
| Name | Academic year label (e.g., "2025-26") |
| Start Date | Calendar start date |
| End Date | Calendar end date |
| Is Active | Boolean toggle — marks the current active year |

**Operations:** Full CRUD. Admin only. Sorted by start date descending.

### 4.2 Classes (`/classes`)

Defines student divisions within an academic year.

| Field | Description |
|-------|-------------|
| Name | Class identifier (e.g., "TE COMP A") |
| Academic Year | Linked academic year |
| Department | Optional department label |

**Constraints:** `(name, academicYear)` must be unique.  
**Operations:** Full CRUD. Admin only. Filterable by academic year.

### 4.3 Subjects (`/subjects`)

Links a course to a class, academic year, and assigned faculty.

| Field | Description |
|-------|-------------|
| Name | Subject name (e.g., "Data Structures") |
| Code | Subject code (e.g., "CS301"), stored uppercase |
| Class | Linked class |
| Academic Year | Linked academic year |
| Faculty | Assigned faculty member |

**Constraints:** `(code, academicYear)` must be unique.  
**Access Control:** Faculty sees only their assigned subjects. Admin sees all.  
**Operations:** Full CRUD. Create/Delete admin only.

---

## 5. Student Management Module

### 5.1 Student Records (`/students`)

| Field | Description |
|-------|-------------|
| Roll No | Unique student identifier per class (e.g., "33157") |
| Name | Full student name |
| Class | Linked class |
| Academic Year | Linked academic year |

**Constraints:** `(rollNo, class, academicYear)` must be unique.

### 5.2 Excel Import

**Endpoint:** `POST /api/students/import` (multipart form)

| Feature | Detail |
|---------|--------|
| File Types | `.xlsx`, `.xls` |
| Max Size | 5 MB |
| Expected Columns | Roll No, Name |
| Required Fields | classId, academicYearId (form fields) |
| Behavior | **Upsert** — creates new students, updates existing (by rollNo), reports skipped/errors |
| Deduplication | Handles duplicate rollNo within same file |
| Response | `{ created: N, updated: N, skipped: N, errors: [...] }` |

### 5.3 Student Operations

- **List:** Filterable by class and academic year
- **Add:** Manual single-student creation
- **Edit:** Update name/rollNo
- **Delete:** Removes student record (cascading score cleanup happens at activity level)

---

## 6. Activity & Rubric Engine

### 6.1 Activities (`/activities`)

An activity represents a single evaluation event (PPT presentation, group discussion, lab, etc.).

| Field | Description |
|-------|-------------|
| Name | Activity title (e.g., "Data Structures PPT") |
| Activity Type | One of: `PPT`, `Flip Classroom`, `GD`, `Viva`, `Lab`, `Assignment`, `Quiz`, `Project`, `Seminar`, `Other` |
| Subject | Linked subject |
| Faculty | Creator/owner |
| Total Marks | Maximum raw marks for this activity |
| Topic | Activity topic (used for AI generation) |
| Guidelines | Faculty instructions (can be AI-generated) |
| Status | `draft` → `submitted` → `locked` |

### 6.2 Activity Lifecycle

```
  ┌─────────┐     Submit      ┌───────────┐     Lock (Admin)     ┌────────┐
  │  DRAFT  │ ──────────────► │ SUBMITTED │ ──────────────────► │ LOCKED │
  └─────────┘                 └───────────┘                      └────────┘
       ▲                            │                                 │
       │         Unlock             │          Unlock                 │
       └────────────────────────────┘◄────────────────────────────────┘
```

| State | Who | Effect |
|-------|-----|--------|
| **Draft** | Faculty | Rubrics editable, scores editable, can delete |
| **Submitted** | Faculty submits | All rubrics locked, signals "ready for review" |
| **Locked** | Admin locks | Fully frozen — no edits to rubrics or scores |
| **Unlock** | Admin or Faculty | Returns to draft, unlocks all rubrics |

### 6.3 Auto-Rubric from Templates

When creating an activity, the system automatically checks for an **Activity Template** matching the activity type. If found, the template's default rubrics are copied to the new activity.

### 6.4 Rubrics (`/rubrics`)

Each activity has 1–N rubrics. Each rubric defines evaluation criteria on a 5-point scale.

| Field | Description |
|-------|-------------|
| Name | Rubric title (e.g., "Content Quality") |
| Scale 1 | Description for score 1 (Poor) |
| Scale 2 | Description for score 2 (Below Average) |
| Scale 3 | Description for score 3 (Average) |
| Scale 4 | Description for score 4 (Good) |
| Scale 5 | Description for score 5 (Excellent) |
| Order | Display sequence (auto-incremented) |
| Is Locked | Locked when activity is submitted/locked |

**Operations:**
- **Add Rubric** — Only when activity is in draft
- **Edit Rubric** — Inline editing of name + all 5 criteria descriptions
- **Delete Rubric** — If scores exist, requires `force: true` confirmation; cascades score cleanup and recomputes subject results
- **Save to Library** — Faculty can save any rubric to their personal reusable library
- **Apply from Library** — Copy a saved library rubric into an activity

### 6.5 Faculty Rubric Library

A personal collection of saved rubrics per faculty member.

| Feature | Detail |
|---------|--------|
| Save | Any rubric can be saved (stores activity type + criteria) |
| Browse | Filterable by activity type |
| Apply | Copy from library into any draft activity |
| Delete | Remove from personal library |

---

## 7. Grading & Scoring System

### 7.1 Grading Grid (`/grading/:activityId`)

The grading interface uses **AG Grid** to provide a spreadsheet-like experience:

| Column | Type | Description |
|--------|------|-------------|
| Roll No | Pinned left | Student roll number (read-only) |
| Name | Pinned left | Student name (read-only) |
| *[Rubric 1..N]* | Editable | Dropdown selector: 1–5 scale, color-coded |
| Score | Pinned right | Auto-calculated activity score (read-only) |

**Cell Color Coding:**
- 🔴 Red (score ≤ 2) — Poor/Below Average
- 🟡 Yellow (ungraded) — Not yet scored
- 🟢 Green (score ≥ 4) — Good/Excellent

**Features:**
- Header tooltips showing full rubric criteria descriptions
- Live score recalculation on every cell edit
- "Save All Scores" button for bulk persistence
- Locked activity displays a warning banner and disables editing
- Scores can only be entered by the faculty who owns the activity

### 7.2 Score Computation Formula

**Activity Score** for a student:

$$\text{Activity Score} = \frac{\sum(\text{Rubric Scores})}{\text{Number of Rubrics} \times 5} \times \text{Activity Total Marks}$$

**Final Subject Score** (out of 15):

$$\text{Final}_{/15} = \frac{\sum(\text{All Activity Scores})}{\sum(\text{All Activity Total Marks})} \times 15$$

### 7.3 Bulk Score Save

- Endpoint: `POST /api/scores/bulk`
- Accepts array of `{ studentId, rubricId, score }` objects
- Validates: activity not locked, faculty owns the activity, scores in 1–5 range
- After saving: automatically triggers full subject result recomputation for all students

---

## 8. Results & Final Computation

### 8.1 Results Page (`/results/:subjectId`)

| Section | Content |
|---------|---------|
| **Subject Header** | Name, code, class, faculty |
| **Action Buttons** | Recompute Results, Export Excel, Export PDF Report |
| **Summary Cards** | Student Count, Average Score /15, Highest Score, Lowest Score |
| **Results Table** | Roll No, Name, [Activity 1 marks, Activity 2 marks, ...], Raw Total, **Final /15** |

### 8.2 Result Recomputation (`POST /api/scores/recompute/:subjectId`)

Triggered automatically after bulk score save, or manually via button.

**Process:**
1. Fetches all activities for the subject
2. For each student, aggregates all activity scores
3. Computes raw total and converts to final out of 15
4. Atomic upsert to `FinalSubjectResult` collection
5. Stores per-activity breakdown in the result document

**Performance:** Processes in batches of 50 students using `Promise.all` for parallelism.

### 8.3 FinalSubjectResult Schema

| Field | Description |
|-------|-------------|
| Subject | Linked subject |
| Student | Linked student |
| Raw Total | Sum of all activity scores (unscaled) |
| Max Possible | Sum of all activity total marks |
| Final Out Of 15 | Scaled final score (0–15, 2 decimal places) |
| Activity Breakdown | Array of `{ activity, activityScore, totalMarks }` |

---

## 9. Export Module (Excel & PDF)

### 9.1 Excel Export (`GET /api/exports/results/:subjectId`)

Generates a downloadable `.xlsx` workbook:

| Feature | Detail |
|---------|--------|
| Headers | Styled blue background with white bold text |
| Columns | Roll No, Name, [Activity name + marks for each activity], Raw Total, Final /15 |
| Formatting | Auto-filter, auto-width columns |
| Filename | `Results_<SubjectCode>_<Timestamp>.xlsx` |

### 9.2 PDF Report Export (`GET /api/exports/report/:subjectId`)

Generates a downloadable PDF document with 8 sections:

| Section | Content |
|---------|---------|
| **Header** | Subject name, code, faculty, class, academic year |
| **1. Activities Overview** | Activity names, types, total marks, rubric counts |
| **2. Rubric Framework** | Rubric names and criteria descriptions |
| **3. Evaluation Methodology** | Description of the scoring process |
| **4. Score Distribution** | Histogram-style breakdown: 0–3, 3–6, 6–9, 9–12, 12–15 |
| **5. Key Observations** | AI-generated observations about class performance |
| **6. Weakness Analysis** | AI-identified weak areas |
| **7. Improvement Actions** | Suggested improvement strategies |
| **8. Outcome Narrative** | Overall assessment narrative |

The PDF content is sourced from the AI-generated NAAC/NBA report (if available).

---

## 10. AI-Powered Tools (5 Features)

All AI features are accessible from the **AI Tools** page (`/ai-tools`) and use **Google Gemini** or **OpenAI** via the OpenAI-compatible API.

### 10.1 Auto Rubric Generator

| Input | Output |
|-------|--------|
| Activity Type (PPT, GD, Lab, etc.) | 4–6 structured rubrics |
| Topic (e.g., "Data Structures") | Each with name + 5-scale criteria |

**Example Output:**
```json
[
  {
    "name": "Content Accuracy",
    "criteria": {
      "scale1": "Significant inaccuracies...",
      "scale2": "Several inaccuracies...",
      "scale3": "Generally accurate...",
      "scale4": "Mostly accurate with good depth...",
      "scale5": "Excellent mastery with deep insights..."
    }
  }
]
```

### 10.2 Guidelines Generator

| Input | Output |
|-------|--------|
| Activity Type + Topic | Structured faculty guidelines text |

Generates detailed instructions including evaluation criteria, time allocation, presentation format, and submission requirements.

### 10.3 Student Feedback Generator

| Input | Output |
|-------|--------|
| Activity ID + Student ID | 3–4 sentence personalized feedback |

Analyzes the student's rubric scores across all rubrics and generates constructive, personalized feedback. Saved to the `AIFeedback` collection for retrieval.

### 10.4 Class Insights Generator

| Input | Output |
|-------|--------|
| Activity ID | Insights summary + weak areas array |

Analyzes rubric-level averages across all students to identify:
- Overall class performance patterns
- Specific weak areas with rubric name, average score, and improvement suggestions

Saved to the `AIInsight` collection.

### 10.5 NAAC/NBA Report Generator

| Input | Output |
|-------|--------|
| Subject ID + Report Type | 8-section compliance report |

Generates a comprehensive report with:

| Section | Content |
|---------|---------|
| `activitiesOverview` | Summary of all CIE activities conducted |
| `rubricFramework` | Description of the evaluation rubric framework |
| `evaluationMethod` | Methodology explanation |
| `scoreDistribution` | Statistical analysis of score distribution |
| `observations` | Key observations from the data |
| `weaknessAnalysis` | Identified areas of weakness |
| `improvementActions` | Recommended improvement strategies |
| `outcomeNarrative` | Overall course outcome narrative |

Saved to the `AIReport` collection. Can be exported as PDF.

### 10.6 AI Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `AI_PROVIDER` | `openai` or `gemini` | `openai` |
| `GEMINI_API_KEY` | Google AI Studio API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash` |
| `AI_TIMEOUT_MS` | Request timeout | 30000ms |
| `AI_MAX_RETRIES` | Retry attempts with exponential backoff | 2 |
| `AI_MAX_TOKENS` | Max response tokens | 3000 |

### 10.7 AI Reliability Features

- **Retry with Exponential Backoff** — 1s, 2s, 4s, 8s delays between retries
- **Timeout Protection** — AbortController cancels requests after `AI_TIMEOUT_MS`
- **JSON Parsing Resilience** — Strips markdown fences, fixes trailing commas, validates structure
- **Fallback Values** — Returns sensible defaults if AI output is malformed
- **Usage Logging** — Every AI call logs provider, model, token counts, and duration
- **Rate Limiting** — Configurable per-minute limit on AI endpoints (default: 20/min)

---

## 11. Template Library System

### 11.1 Activity Templates (`/templates`)

Admin-managed templates for standardizing evaluation across activities.

| Field | Description |
|-------|-------------|
| Activity Type | Type label (e.g., "PPT", "Lab") — unique |
| Description | Template description |
| Default Rubrics | Array of pre-defined rubrics with 5-scale criteria |
| Guidelines | Default guidelines text |
| Created By | Admin who created the template |

### 11.2 Auto-Apply Behavior

When a faculty member creates a new activity:
1. System looks for a template matching the activity type
2. If found, all default rubrics are automatically copied to the new activity
3. Faculty can then customize, add, or remove rubrics as needed

### 11.3 Template Management (Admin Only)

- **Create Template** — Activity type, description, guidelines, dynamic rubric builder
- **Edit Template** — Modify any field including rubrics
- **Delete Template** — Removes template (does not affect already-created activities)

---

## 12. Security & Production Hardening

### 12.1 Security Middleware Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Helmet** | `helmet` | Sets security HTTP headers (CSP, HSTS, X-Frame, etc.) |
| **CORS** | `cors` | Restricts origins (configurable, no wildcard in production) |
| **Rate Limiting** | `express-rate-limit` | 200 req/15min global, 20 req/min AI endpoints |
| **Input Validation** | `zod` | 18 named schemas validate all request body/query/params |
| **MongoDB Sanitization** | Custom middleware | Strips `$` operators and `.` in keys to prevent NoSQL injection |
| **JWT Authentication** | `jsonwebtoken` | Bearer token on every protected route |
| **Role Authorization** | Custom `authorize()` | Checks user role against allowed roles |
| **Activity Access** | Custom `checkActivityOwner()` | Verifies faculty owns the activity |

### 12.2 Validation Schemas (18 Total)

| Schema | Validates |
|--------|----------|
| `login` | email (valid format), password (non-empty) |
| `register` | name (2–100), email, password (6+ chars, uppercase, lowercase, number), role, department |
| `changePassword` | currentPassword, newPassword (same rules) |
| `academicYear` | name (3–50), startDate, endDate, isActive |
| `classCreate` | name (2–100), academicYear (ObjectId), department |
| `subject` | name (2–200), code (2–20), class, academicYear, faculty (all ObjectIds) |
| `studentCreate` | rollNo (1–20), name (2–100), class, academicYear |
| `studentImport` | classId, academicYearId (as strings) |
| `activityCreate` | name, activityType (10 enum values), subject, totalMarks (1–500), topic, guidelines |
| `activityUpdate` | All activity fields optional |
| `rubricCreate` | name, activity, scale1–5, order |
| `rubricUpdate` | All rubric fields optional |
| `scoreBulk` | Array of { student, rubric, score (1–5) } + activityId |
| `aiGenerateRubrics` | activityType, topic |
| `aiGenerateGuidelines` | activityType, topic |
| `aiStudentFeedback` | activityId, studentId |
| `aiClassInsights` | activityId |
| `aiNAACReport` | subjectId, reportType |
| `adminUserUpdate` | name, email, role, isActive, department (all optional) |
| `templateCreate` | activityType, description, defaultRubrics[], guidelines |

### 12.3 Logging

| Transport | Level | Rotation | Format |
|-----------|-------|----------|--------|
| `logs/error.log` | error only | 10MB × 5 files | JSON |
| `logs/combined.log` | all levels | 10MB × 10 files | JSON |
| Console | debug (dev) / warn (prod) | — | Colorized |

HTTP requests are logged via Morgan → Winston integration.

### 12.4 Startup Validation

On server boot, `configValidator` checks:
- Required variables exist (MONGO_URI, JWT secrets)
- JWT secrets meet minimum length (32 chars recommended)
- Admin password is not the default in production
- CORS is not wildcard in production
- Warns about missing AI API keys

---

## 13. Audit Trail System

Every critical operation is logged to the `AuditLog` collection.

### 13.1 Tracked Actions (27 Types)

| Category | Actions |
|----------|---------|
| **Activity Lifecycle** | `ACTIVITY_CREATE`, `ACTIVITY_UPDATE`, `ACTIVITY_DELETE`, `ACTIVITY_SUBMIT`, `ACTIVITY_LOCK`, `ACTIVITY_UNLOCK` |
| **Rubric Operations** | `RUBRIC_CREATE`, `RUBRIC_UPDATE`, `RUBRIC_DELETE` |
| **Score Operations** | `SCORES_BULK_SAVE`, `SCORES_RECOMPUTE` |
| **User Management** | `USER_CREATE`, `USER_UPDATE`, `USER_DEACTIVATE`, `USER_ACTIVATE` |
| **Data Operations** | `STUDENTS_IMPORT`, `RESULTS_EXPORT`, `REPORT_EXPORT` |
| **AI Operations** | `AI_GENERATE_RUBRICS`, `AI_GENERATE_GUIDELINES`, `AI_GENERATE_FEEDBACK`, `AI_GENERATE_INSIGHTS`, `AI_GENERATE_REPORT` |
| **Authentication** | `PASSWORD_CHANGE`, `LOGIN_SUCCESS`, `LOGIN_FAILED` |

### 13.2 Audit Log Fields

| Field | Description |
|-------|-------------|
| User | Who performed the action (ObjectId + name + role) |
| Action | Action enum value |
| Entity Type | What was affected (Activity, Score, User, etc.) |
| Entity ID | Specific document ID |
| Description | Human-readable description |
| Previous Value | Snapshot before the change (for updates) |
| New Value | Snapshot after the change |
| IP Address | Request origin IP |
| User Agent | Browser/client identifier |
| Timestamp | When the action occurred |

### 13.3 Design Principles

- **Fire-and-Forget** — Audit writes never block the HTTP response
- **Never Crashes** — Audit errors are logged but never propagate to the user
- **Indexed for Querying** — Indexes on `createdAt`, `user`, `entityType+entityId`, `action`

---

## 14. API Reference (57 Endpoints)

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | — | Login with email/password, returns JWT tokens |
| `POST` | `/api/auth/refresh` | — | Refresh access token using refresh token |
| `POST` | `/api/auth/register` | Admin | Register new user |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `PUT` | `/api/auth/password` | Yes | Change password |

### Academic Years (`/api/academic-years`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/academic-years` | Yes | List all academic years |
| `GET` | `/api/academic-years/:id` | Yes | Get single academic year |
| `POST` | `/api/academic-years` | Admin | Create academic year |
| `PUT` | `/api/academic-years/:id` | Admin | Update academic year |
| `DELETE` | `/api/academic-years/:id` | Admin | Delete academic year |

### Classes (`/api/classes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/classes` | Yes | List all classes (filterable by academicYear) |
| `GET` | `/api/classes/:id` | Yes | Get single class |
| `POST` | `/api/classes` | Admin | Create class |
| `PUT` | `/api/classes/:id` | Admin | Update class |
| `DELETE` | `/api/classes/:id` | Admin | Delete class |

### Subjects (`/api/subjects`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/subjects` | Yes | List subjects (faculty sees own only) |
| `GET` | `/api/subjects/:id` | Yes | Get single subject |
| `POST` | `/api/subjects` | Admin | Create subject with faculty assignment |
| `PUT` | `/api/subjects/:id` | Admin | Update subject |
| `DELETE` | `/api/subjects/:id` | Admin | Delete subject |

### Students (`/api/students`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/students` | Yes | List students (filterable by class, academicYear) |
| `GET` | `/api/students/:id` | Yes | Get single student |
| `POST` | `/api/students` | Yes | Create student |
| `PUT` | `/api/students/:id` | Yes | Update student |
| `DELETE` | `/api/students/:id` | Yes | Delete student |
| `POST` | `/api/students/import` | Yes | Bulk import from Excel |

### Activities (`/api/activities`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/activities` | Yes | List activities (filterable by subject) |
| `GET` | `/api/activities/:id` | Yes | Get activity with rubrics |
| `POST` | `/api/activities` | Yes | Create activity (auto-applies template rubrics) |
| `PUT` | `/api/activities/:id` | Owner | Update activity (if not locked) |
| `DELETE` | `/api/activities/:id` | Owner | Delete activity + cascade cleanup |
| `POST` | `/api/activities/:id/submit` | Owner | Submit activity (locks rubrics) |
| `POST` | `/api/activities/:id/lock` | Admin | Lock activity (fully freeze) |
| `POST` | `/api/activities/:id/unlock` | Admin/Owner | Unlock → draft |

### Rubrics (`/api/rubrics`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/rubrics/activity/:activityId` | Yes | Get rubrics for activity |
| `POST` | `/api/rubrics` | Owner | Add rubric to activity |
| `PUT` | `/api/rubrics/:id` | Owner | Update rubric |
| `DELETE` | `/api/rubrics/:id` | Owner | Delete rubric (force if scores exist) |
| `GET` | `/api/rubrics/library` | Yes | Get personal rubric library |
| `POST` | `/api/rubrics/library` | Yes | Save rubric to library |
| `DELETE` | `/api/rubrics/library/:id` | Yes | Delete from library |
| `POST` | `/api/rubrics/library/:id/apply` | Yes | Apply library rubric to activity |

### Scores (`/api/scores`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/scores/activity/:activityId` | Yes | Get grading grid data |
| `POST` | `/api/scores/bulk` | Owner | Bulk save scores |
| `GET` | `/api/scores/results/:subjectId` | Yes | Get final subject results |
| `POST` | `/api/scores/recompute/:subjectId` | Yes | Force recompute all results |

### Exports (`/api/exports`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/exports/results/:subjectId` | Yes | Download Excel results |
| `GET` | `/api/exports/report/:subjectId` | Yes | Download PDF report |

### AI Tools (`/api/ai`)

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|-----------|-------------|
| `POST` | `/api/ai/generate-rubrics` | Yes | 20/min | Generate rubrics from type + topic |
| `POST` | `/api/ai/generate-guidelines` | Yes | 20/min | Generate activity guidelines |
| `POST` | `/api/ai/student-feedback` | Yes | 20/min | Generate student feedback |
| `POST` | `/api/ai/class-insights` | Yes | 20/min | Generate class performance insights |
| `POST` | `/api/ai/naac-report` | Yes | 20/min | Generate NAAC/NBA report |
| `GET` | `/api/ai/feedback/:activityId` | Yes | — | Get saved feedback |
| `GET` | `/api/ai/insights/:activityId` | Yes | — | Get saved insights |
| `GET` | `/api/ai/report/:subjectId` | Yes | — | Get saved report |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/users` | Admin | Paginated user list |
| `PUT` | `/api/admin/users/:id` | Admin | Update user |
| `GET` | `/api/admin/faculty` | Admin | List active faculty |
| `GET` | `/api/admin/stats` | Admin | Dashboard statistics |
| `POST` | `/api/admin/templates` | Admin | Create activity template |
| `PUT` | `/api/admin/templates/:id` | Admin | Update template |
| `DELETE` | `/api/admin/templates/:id` | Admin | Delete template |
| `GET` | `/api/admin/templates` | Admin | List templates |
| `GET` | `/api/admin/activities` | Admin | All activities (admin oversight) |
| `GET` | `/api/admin/system-health` | Admin | System health metrics |
| `GET` | `/api/admin/audit-logs` | Admin | Query audit trail |

### Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/health` | — | Server status, DB state, uptime, memory |

---

## 15. Database Schema (15 Models)

| # | Model | Collection | Key Indexes |
|---|-------|-----------|-------------|
| 1 | **User** | `users` | email (unique) |
| 2 | **AcademicYear** | `academicyears` | name (unique) |
| 3 | **Class** | `classes` | (name + academicYear) unique |
| 4 | **Subject** | `subjects` | (code + academicYear) unique |
| 5 | **Student** | `students` | (rollNo + class + academicYear) unique |
| 6 | **Activity** | `activities` | (subject), (faculty), (status) |
| 7 | **ActivityRubric** | `activityrubrics` | (activity + order) |
| 8 | **ActivityTemplate** | `activitytemplates` | activityType (unique) |
| 9 | **Score** | `scores` | (activity + student + rubric) unique, (student) |
| 10 | **FinalSubjectResult** | `finalsubjectresults` | (subject + student) unique |
| 11 | **RubricLibrary** | `rubriclibraries` | (faculty + activityType) |
| 12 | **AIFeedback** | `aifeedbacks` | (activity + student) unique |
| 13 | **AIInsight** | `aiinsights` | (activity) |
| 14 | **AIReport** | `aireports` | (subject + faculty) |
| 15 | **AuditLog** | `auditlogs` | createdAt, user, (entityType + entityId), action |

---

## 16. Frontend Pages & Navigation

### 16.1 Route Map

| Path | Page | Access |
|------|------|--------|
| `/login` | Login Page | Public |
| `/` | Dashboard | All authenticated |
| `/academic-years` | Academic Years | Admin only |
| `/classes` | Classes | Admin only |
| `/subjects` | Subjects | All authenticated |
| `/students` | Students | All authenticated |
| `/activities` | Activities | All authenticated |
| `/activities/:id` | Activity Detail | All authenticated |
| `/grading/:activityId` | Grading Grid | All authenticated |
| `/results/:subjectId` | Results | All authenticated |
| `/ai-tools` | AI Tools | All authenticated |
| `/users` | User Management | Admin only |
| `/templates` | Template Management | Admin only |

### 16.2 Sidebar Navigation

```
┌─────────────────────┐
│ PICT CIE Platform    │
│ Smart Evaluation     │
├─────────────────────┤
│ 🏠 Dashboard         │
├─ ADMIN ─────────────┤
│ 📅 Academic Years    │  ← Admin only
│ 📚 Classes           │  ← Admin only
│ 👥 Users             │  ← Admin only
│ 📋 Templates         │  ← Admin only
├─ ACADEMICS ─────────┤
│ 📖 Subjects          │
│ 🎓 Students          │
│ 📝 Activities        │
├─ TOOLS ─────────────┤
│ 🤖 AI Tools          │
├─────────────────────┤
│ 👤 User Name         │
│    Role              │
│ 🚪 Logout            │
└─────────────────────┘
```

### 16.3 UI Technology

| Technology | Purpose |
|-----------|---------|
| **React 18** | Component library |
| **React Router 6** | Client-side routing with protected routes |
| **TailwindCSS 3** | Utility-first styling with custom primary color palette |
| **AG Grid 32** | Spreadsheet-style grading interface |
| **React Hot Toast** | Toast notifications (top-right, 3s auto-dismiss) |
| **React Icons** | Heroicons icon set |
| **Axios** | HTTP client with JWT interceptor |

---

## 17. Deployment Architecture

### 17.1 Docker Compose (Production)

```
┌──────────────────────────────────────────────────┐
│                  Docker Network                   │
│                  (cie-network)                     │
│                                                    │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Frontend  │  │ Backend  │  │   MongoDB     │   │
│  │ (Nginx)   │  │ (Node)   │  │   (mongo:7)   │   │
│  │ Port 80   │→ │ Port 5000│→ │ Port 27017    │   │
│  │ 128MB     │  │ 512MB    │  │ 1GB           │   │
│  └──────────┘  └──────────┘  └───────────────┘   │
│        ↓              ↓              ↓             │
│   Static dist    backend_logs    mongo_data        │
│   (built React)   (volume)       (volume)          │
└──────────────────────────────────────────────────┘
```

### 17.2 Local Development (Hybrid)

```
┌─────────────┐     Proxy /api     ┌─────────────┐     ┌─────────────┐
│ Vite Dev    │ ──────────────────► │ Node.js     │ ──► │ MongoDB     │
│ Port 3000   │                     │ Port 5000   │     │ Port 27017  │
│ (HMR)       │                     │ (Express)   │     │ (Docker)    │
└─────────────┘                     └─────────────┘     └─────────────┘
```

### 17.3 Graceful Shutdown

The backend handles `SIGTERM` and `SIGINT` signals:
1. Stops accepting new connections
2. Waits up to 15 seconds for active requests to complete
3. Closes MongoDB connection pool
4. Exits cleanly

---

## 18. Configuration Reference

### Environment Variables (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `5000` | Backend server port |
| `MONGO_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | Access token signing key (32+ chars) |
| `JWT_EXPIRE` | No | `15m` | Access token expiry |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token signing key (32+ chars) |
| `JWT_REFRESH_EXPIRE` | No | `7d` | Refresh token expiry |
| `CORS_ORIGIN` | No | `*` | Allowed origins (comma-separated) |
| `AI_PROVIDER` | No | `openai` | AI provider: `openai` or `gemini` |
| `OPENAI_API_KEY` | Cond. | — | OpenAI API key (if provider=openai) |
| `OPENAI_MODEL` | No | `gpt-4o` | OpenAI model name |
| `GEMINI_API_KEY` | Cond. | — | Gemini API key (if provider=gemini) |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `GEMINI_BASE_URL` | No | Google endpoint | Gemini OpenAI-compat URL |
| `AI_TIMEOUT_MS` | No | `30000` | AI request timeout (ms) |
| `AI_MAX_RETRIES` | No | `2` | AI retry attempts |
| `AI_MAX_TOKENS` | No | `3000` | Max AI response tokens |
| `AI_RATE_LIMIT_WINDOW_MS` | No | `60000` | AI rate limit window |
| `AI_RATE_LIMIT_MAX` | No | `20` | Max AI requests per window |
| `ADMIN_EMAIL` | No | `admin@pict.edu` | Seed admin email |
| `ADMIN_PASSWORD` | No | `Admin@123` | Seed admin password |
| `LOG_LEVEL` | No | `debug` (dev) / `info` (prod) | Winston log level |

---

*Generated for PICT Smart CIE Evaluation Platform v1.0.0*
