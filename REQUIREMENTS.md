# 📘 PICT Smart CIE Evaluation Platform — Functional Requirements

## 1. User Roles

The software must support two types of users:

### Admin

* Can manage academic years, classes, subjects, and faculty
* Can view all activities, rubrics, and results
* Can lock or unlock any activity
* Can generate department-level reports
* Can manage activity templates and default rubrics
* Can view audit logs and system health

### Faculty

* Can access only their assigned subjects
* Can create and manage CIE activities
* Can create, edit, add, or remove rubrics (for their own activity only)
* Can grade students
* Can export results and reports
* Can use AI tools (rubric generator, feedback, reports, etc.)

---

## 2. Academic Structure

The software must support:

* Multiple **Academic Years** (e.g., 2025–26)
* Each year has multiple **Classes**
* Each class has multiple **Subjects**
* Each subject is assigned to **one faculty**
* Same student list is used for all subjects of that class

---

## 3. Student Management

The software must allow:

* Importing student list from Excel
* Each student must have:

  * Roll Number
  * Name
* Prevent duplicate students in same class/year
* Editing and deleting student records
* Students linked to class and academic year

---

## 4. CIE Activity Management

Faculty must be able to:

* Create multiple CIE activities for a subject
* Enter **custom total marks** for each activity
* Select activity type (PPT, Flip Classroom, GD, Viva, Lab, etc.)
* Add topic and guidelines
* Use template rubrics automatically (if available)

Each activity must have lifecycle:

* Draft → Submitted → Locked → Unlock

Rules:

* Rubrics editable only in Draft
* After Submit → Rubrics locked
* Admin/Faculty can Unlock
* Locked activity cannot be edited

---

## 5. Rubric System

The system must support:

* Predefined rubrics from templates
* Faculty can:

  * Add custom rubric
  * Remove rubric
  * Edit rubric
  * Reuse rubric from personal library
* Rubric changes must affect **only that faculty's activity**
* Each rubric must have:

  * Name
  * Criteria for score 1–5
* Rubrics lock after submission

---

## 6. Grading System

Faculty must be able to:

* Grade each student using rubric scores (1–5)
* Use spreadsheet-style grading interface
* View auto-calculated score per student

Score calculation:

* Activity score based on rubric performance
* Final subject score normalized **out of 15**
* Final score rounded to 2 decimal places

---

## 7. Results System

The system must:

* Combine marks from all activities of a subject
* Calculate:

  * Raw total
  * Final score out of 15
* Show results table:

  * Roll No
  * Name
  * Activity marks
  * Raw total
  * Final /15
* Allow recomputation if scores change

---

## 8. Export Features

The software must allow:

### Excel Export

* Final results per subject
* Include all activities and totals

### PDF Report

* Activity summary
* Rubrics used
* Score distribution
* Observations
* Weakness analysis
* Improvement suggestions
* Outcome narrative

---

## 9. AI Features (Must be Included)

### 1. Auto Rubric Generator

* Faculty enters activity type + topic
* AI generates rubric titles + criteria

### 2. Activity Guidelines Generator

* AI generates how to conduct activity

### 3. Student Feedback Generator

* AI generates feedback based on rubric scores

### 4. Class Performance Insight

* AI identifies weak areas in class

### 5. NAAC/NBA Report Generator

* AI generates academic report for faculty/subject

---

## 10. Template System

Admin must be able to:

* Create activity templates
* Define default rubrics
* Add default guidelines

When faculty creates activity → template auto-applied.

---

## 11. Locking Rules

* Draft → fully editable
* Submitted → rubrics locked
* Locked → everything frozen
* Unlock → editable again
* Only Admin/Owner can unlock

---

## 12. Audit System

Software must track:

* Activity creation, submit, lock, unlock
* Rubric edits
* Score changes
* Student import
* Report generation
* AI usage
* User actions

---

## 13. Security Requirements

The system must:

* Use login authentication
* Restrict faculty to own subjects only
* Prevent unauthorized access
* Validate inputs
* Protect data integrity
* Log errors and actions

---

## 14. Multi-Academic-Year Support

* Old academic data must remain preserved
* New academic year starts fresh
* Reports can be generated year-wise

---

## 15. Deployment Requirement

The software must run:

* On cloud server
* On PICT local server (hybrid)
* Support ~200 users
* Web interface only (no mobile required)

---

## 16. Usability Requirements

The software must be:

* Simple for faculty to use
* Fast grading interface
* Minimal manual calculation
* Standardized evaluation
* Useful for NAAC/NBA compliance
