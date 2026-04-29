// ==========================================
// Export Controller — Excel & PDF exports
// ==========================================

const Subject = require('../models/Subject');
const Activity = require('../models/Activity');
const ActivityRubric = require('../models/ActivityRubric');
const ActivityTemplate = require('../models/ActivityTemplate');
const Score = require('../models/Score');
const Student = require('../models/Student');
const FinalSubjectResult = require('../models/FinalSubjectResult');
const AIReport = require('../models/AIReport');
const { generateResultsExcel } = require('../services/excelService');
const { generateReportPDF, generateActivityReportPDF } = require('../services/pdfService');

/** GET /api/exports/subject/:subjectId/excel — Download results Excel */
exports.exportSubjectExcel = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.subjectId)
      .populate('class', 'name')
      .populate('academicYear', 'name');
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    const activities = await Activity.find({ subject: subject._id }).sort('createdAt');
    const students = await Student.find({
      class: subject.class._id,
      academicYear: subject.academicYear._id,
    }).sort('rollNo');
    const results = await FinalSubjectResult.find({ subject: subject._id });

    const workbook = await generateResultsExcel(
      {
        subjectName: subject.name,
        subjectCode: subject.code,
        className: subject.class?.name || 'N/A',
        academicYearName: subject.academicYear?.name || 'N/A',
      },
      activities,
      results,
      students
    );

    const filename = `${subject.code}_${subject.name}_Results.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/** GET /api/exports/subject/:subjectId/report-pdf — Download NAAC/NBA PDF */
exports.exportReportPDF = async (req, res, next) => {
  try {
    const report = await AIReport.findOne({ subject: req.params.subjectId })
      .populate({
        path: 'subject',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'academicYear', select: 'name' },
        ],
      })
      .populate('faculty', 'name');

    if (!report) {
      return res.status(404).json({ message: 'No AI report found. Generate one first.' });
    }

    const pdfBuffer = await generateReportPDF({
      reportType: report.reportType,
      subjectName: report.subject.name,
      subjectCode: report.subject.code,
      facultyName: report.faculty.name,
      className: report.subject.class.name,
      academicYear: report.subject.academicYear.name,
      content: report.content,
    });

    const filename = `${report.subject.code}_${report.reportType}_Report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};

/** POST /api/exports/activity/:activityId/report-pdf — Download activity report PDF with optional images */
exports.exportActivityPDF = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.activityId)
      .populate({
        path: 'subject',
        select: 'name code class academicYear',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'academicYear', select: 'name' },
        ],
      })
      .populate('faculty', 'name email');

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found.' });
    }

    if (req.user.role === 'faculty' && activity.faculty?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const [rubrics, template, students, scores] = await Promise.all([
      ActivityRubric.find({ activity: activity._id }).sort('order').lean(),
      ActivityTemplate.findOne({ activityType: activity.activityType }).lean(),
      Student.find({
        class: activity.subject?.class?._id,
        academicYear: activity.subject?.academicYear?._id,
      }).sort('rollNo').lean(),
      Score.find({ activity: activity._id }).lean(),
    ]);

    const rubricById = new Map(rubrics.map((r) => [String(r._id), r]));
    const studentRows = students.map((s) => ({
      studentId: String(s._id),
      rollNo: s.rollNo,
      name: s.name,
      rubricScores: {},
      rawTotal: 0,
      activityMarks: 0,
    }));
    const studentMap = new Map(studentRows.map((row) => [row.studentId, row]));

    for (const scoreDoc of scores) {
      const row = studentMap.get(String(scoreDoc.student));
      const rubric = rubricById.get(String(scoreDoc.rubric));
      if (!row || !rubric) continue;
      row.rubricScores[String(scoreDoc.rubric)] = scoreDoc.score;
    }

    const maxRaw = rubrics.length * 5;
    for (const row of studentRows) {
      row.rawTotal = rubrics.reduce((sum, r) => sum + (Number(row.rubricScores[String(r._id)]) || 0), 0);
      row.activityMarks = maxRaw > 0
        ? Math.round(((row.rawTotal / maxRaw) * activity.totalMarks) * 100) / 100
        : 0;
    }

    const gradedStudents = studentRows.filter((row) => row.rawTotal > 0);
    const avgMarks = gradedStudents.length
      ? Math.round((gradedStudents.reduce((sum, row) => sum + row.activityMarks, 0) / gradedStudents.length) * 100) / 100
      : 0;

    const images = (req.files || []).map((file) => ({
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: file.buffer,
    }));

    const pdfBuffer = await generateActivityReportPDF({
      activity: {
        id: String(activity._id),
        name: activity.name,
        type: activity.activityType,
        topic: activity.topic || '',
        guidelines: activity.guidelines || '',
        videoUrl: activity.videoUrl || '',
        totalMarks: activity.totalMarks,
        status: activity.status,
        createdAt: activity.createdAt,
        submittedAt: activity.submittedAt,
        lockedAt: activity.lockedAt,
      },
      subject: {
        name: activity.subject?.name || 'N/A',
        code: activity.subject?.code || 'N/A',
        className: activity.subject?.class?.name || 'N/A',
        academicYear: activity.subject?.academicYear?.name || 'N/A',
      },
      faculty: {
        name: activity.faculty?.name || 'N/A',
        email: activity.faculty?.email || 'N/A',
      },
      templateGuide: template?.learningGuide || null,
      rubrics,
      studentRows,
      summary: {
        totalStudents: students.length,
        gradedStudents: gradedStudents.length,
        averageMarks: avgMarks,
      },
      generatedBy: req.user?.name || req.user?.email || 'System',
      images,
    });

    const safeName = `${activity.name || 'Activity'}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${safeName}_Activity_Report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
};
