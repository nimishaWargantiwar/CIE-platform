// ==========================================
// Subject Controller
// ==========================================

const Subject = require('../models/Subject');

/** GET /api/subjects */
exports.getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.academicYear) filter.academicYear = req.query.academicYear;
    if (req.query.class) filter.class = req.query.class;

    // Faculty sees only their own subjects
    if (req.user.role === 'faculty') {
      filter.faculty = req.user._id;
    }

    const subjects = await Subject.find(filter)
      .populate('class', 'name')
      .populate('academicYear', 'name')
      .populate('faculty', 'name email')
      .sort('name');
    res.json(subjects);
  } catch (err) {
    next(err);
  }
};

/** GET /api/subjects/:id */
exports.getById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('class', 'name')
      .populate('academicYear', 'name')
      .populate('faculty', 'name email');
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });

    // Faculty can only view their own subjects
    if (req.user.role === 'faculty' && subject.faculty._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json(subject);
  } catch (err) {
    next(err);
  }
};

/** POST /api/subjects (admin only) */
exports.create = async (req, res, next) => {
  try {
    const { name, code, class: classId, academicYear, faculty } = req.body;

    const subject = await Subject.create({ name, code, class: classId, academicYear, faculty });
    res.status(201).json(subject);
  } catch (err) {
    next(err);
  }
};

/** PUT /api/subjects/:id */
exports.update = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    res.json(subject);
  } catch (err) {
    next(err);
  }
};

/** DELETE /api/subjects/:id */
exports.remove = async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    res.json({ message: 'Subject deleted.' });
  } catch (err) {
    next(err);
  }
};
