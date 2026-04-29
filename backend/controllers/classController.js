// ==========================================
// Class Controller
// ==========================================

const Class = require('../models/Class');

/** GET /api/classes */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;

    const classes = await Class.find(filter)
      .populate('academicYear', 'name')
      .sort('name');
    res.json(classes);
  } catch (err) {
    next(err);
  }
};

/** GET /api/classes/:id */
exports.getById = async (req, res, next) => {
  try {
    const cls = await Class.findById(req.params.id).populate('academicYear', 'name');
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json(cls);
  } catch (err) {
    next(err);
  }
};

/** POST /api/classes */
exports.create = async (req, res, next) => {
  try {
    const { name, academicYear, department } = req.body;

    const cls = await Class.create({ name, academicYear, department });
    res.status(201).json(cls);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/classes/:id */
exports.update = async (req, res, next) => {
  try {
    const cls = await Class.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json(cls);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/classes/:id */
exports.remove = async (req, res, next) => {
  try {
    const cls = await Class.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: 'Class not found.' });
    res.json({ message: 'Class deleted.' });
  } catch (err) {
    next(err);
  }
};
