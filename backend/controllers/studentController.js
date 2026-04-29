// ==========================================
// Student Controller — CRUD + Excel Import + Audit
// ==========================================

const Student = require('../models/Student');
const { parseStudentExcel } = require('../services/excelService');
const audit = require('../services/auditService');
const logger = require('../services/logger');

/** GET /api/students */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.class) filter.class = req.query.class;
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;

    const students = await Student.find(filter)
      .populate('class', 'name')
      .populate('academicYear', 'name')
      .sort('rollNo');
    res.json(students);
  } catch (err) {
    next(err);
  }
};

/** GET /api/students/:id */
exports.getById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('class', 'name')
      .populate('academicYear', 'name');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json(student);
  } catch (err) {
    next(err);
  }
};

/** POST /api/students */
exports.create = async (req, res, next) => {
  try {
    const student = await Student.create(req.body);

    audit.log({
      req,
      action: 'STUDENT_CREATE',
      entityType: 'Student',
      entityId: student._id,
      description: `Student created: ${student.name} (${student.rollNo})`,
    });

    res.status(201).json(student);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Student with this roll number already exists in this class/year.' });
    }
    next(err);
  }
};

/** PUT /api/students/:id */
exports.update = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });
    res.json(student);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/students/:id */
exports.remove = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    audit.log({
      req,
      action: 'STUDENT_DELETE',
      entityType: 'Student',
      entityId: req.params.id,
      description: `Student deleted: ${student.name} (${student.rollNo})`,
    });

    res.json({ success: true, message: 'Student deleted.' });
  } catch (err) {
    next(err);
  }
};

/** POST /api/students/import — Excel upload */
exports.importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel file is required.' });
    }

    const { classId, academicYearId } = req.body;
    if (!classId || !academicYearId) {
      return res.status(400).json({ success: false, message: 'classId and academicYearId are required.' });
    }

    // Validate file type
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (req.file.mimetype && !allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only Excel files (.xlsx, .xls) are accepted.' });
    }

    const { students, errors } = await parseStudentExcel(req.file.buffer);

    if (students.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid students found.', errors });
    }

    // Bulk upsert (skip duplicates)
    const results = { created: 0, updated: 0, skipped: 0, errors: [...errors] };

    for (const s of students) {
      try {
        const existing = await Student.findOne({
          rollNo: s.rollNo,
          class: classId,
          academicYear: academicYearId,
        });

        await Student.findOneAndUpdate(
          { rollNo: s.rollNo, class: classId, academicYear: academicYearId },
          { name: s.name, rollNo: s.rollNo, class: classId, academicYear: academicYearId },
          { upsert: true, new: true }
        );

        if (existing) {
          results.updated++;
        } else {
          results.created++;
        }
      } catch (err) {
        if (err.code === 11000) {
          results.skipped++;
        } else {
          results.errors.push(`${s.rollNo}: ${err.message}`);
        }
      }
    }

    audit.log({
      req,
      action: 'STUDENTS_IMPORT',
      entityType: 'Student',
      entityId: classId,
      description: `Excel import: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
    });

    logger.info('Student import completed', {
      classId,
      academicYearId,
      created: results.created,
      updated: results.updated,
      errors: results.errors.length,
    });

    res.json({
      success: true,
      message: `Imported ${results.created} students. Updated ${results.updated}. Skipped ${results.skipped}.`,
      ...results,
    });
  } catch (err) {
    next(err);
  }
};
