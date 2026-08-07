const Patient = require('../models/Patient');
const Report = require('../models/Report');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

exports.createPatient = asyncHandler(async (req, res) => {
  const { name, age, gender, patientIdentifier } = req.body;

  if (!name) {
    throw new AppError('Patient name is required', 400);
  }

  const patient = await Patient.create({
    doctorId: req.doctor.id,
    name,
    age,
    gender,
    patientIdentifier,
  });

  res.status(201).json({ success: true, patient });
});

exports.getPatients = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const query = { doctorId: req.doctor.id };

  if (req.query.search) {
    query.name = { $regex: req.query.search, $options: 'i' };
  }

  const [patients, total] = await Promise.all([
    Patient.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Patient.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: patients.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    patients,
  });
});

exports.getPatientById = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  if (patient.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to access this patient', 403);
  }

  res.status(200).json({ success: true, patient });
});

exports.updatePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  if (patient.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to update this patient', 403);
  }

  const { name, age, gender, patientIdentifier } = req.body;

  if (name !== undefined) patient.name = name;
  if (age !== undefined) patient.age = age;
  if (gender !== undefined) patient.gender = gender;
  if (patientIdentifier !== undefined) patient.patientIdentifier = patientIdentifier;

  await patient.save();

  res.status(200).json({ success: true, patient });
});

// @desc    Add a new dated note entry for a patient (e.g. on each visit)
// @route   POST /api/patients/:id/notes
// @access  Private
exports.addNote = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    throw new AppError('Note text is required', 400);
  }

  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  if (patient.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to update this patient', 403);
  }

  patient.notes.push({ text: text.trim() });
  await patient.save();

  res.status(201).json({ success: true, patient });
});

exports.deletePatient = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);

  if (!patient) {
    throw new AppError('Patient not found', 404);
  }

  if (patient.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to delete this patient', 403);
  }

  const reportCount = await Report.countDocuments({ patientId: patient._id });
  if (reportCount > 0) {
    throw new AppError(
      'Cannot delete a patient with existing reports. Delete the reports first.',
      400
    );
  }

  await patient.deleteOne();

  res.status(200).json({ success: true, message: 'Patient deleted successfully' });
});