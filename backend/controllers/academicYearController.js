// ==========================================
// Academic Year Controller
// ==========================================

const AcademicYear = require('../models/AcademicYear');

/** GET /api/academic-years */
exports.getAll = async (req, res, next) => {
  try {
    const years = await AcademicYear.find().sort('-startDate');
    res.json(years);
  } catch (err) {
    next(err);
  }
};

/** GET /api/academic-years/:id */
exports.getById = async (req, res, next) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });
    res.json(year);
  } catch (err) {
    next(err);
  }
};

/** POST /api/academic-years */
exports.create = async (req, res, next) => {
  try {
    const { name, startDate, endDate } = req.body;

    const year = await AcademicYear.create({ name, startDate, endDate });
    res.status(201).json(year);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/academic-years/:id */
exports.update = async (req, res, next) => {
  try {
    const year = await AcademicYear.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });
    res.json(year);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/academic-years/:id */
exports.remove = async (req, res, next) => {
  try {
    const year = await AcademicYear.findByIdAndDelete(req.params.id);
    if (!year) return res.status(404).json({ message: 'Academic year not found.' });
    res.json({ message: 'Academic year deleted.' });
  } catch (err) {
    next(err);
  }
};
