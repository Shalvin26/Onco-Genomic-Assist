const Report = require('../models/Report');
const Patient = require('../models/Patient');
const Analysis = require('../models/Analysis');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const { uploadPdfToCloudinary, deletePdfFromCloudinary } = require('../services/cloudinaryUpload');
const { extractTextFromPdf } = require('../services/pdfExtraction');

const getOwnedPatientOrFail = async (patientId, doctorId) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  if (patient.doctorId.toString() !== doctorId) {
    throw new AppError('Not authorized to access this patient', 403);
  }
  return patient;
};

exports.uploadReport = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  if (!req.file) {
    throw new AppError('No PDF file was uploaded', 400);
  }

  await getOwnedPatientOrFail(patientId, req.doctor.id);

  let report = await Report.create({
    patientId,
    doctorId: req.doctor.id,
    originalFileName: req.file.originalname,
    filePath: 'pending',
    status: 'processing',
  });

  try {
    const { secureUrl, publicId } = await uploadPdfToCloudinary(req.file.buffer, req.doctor.id);
    const extractedText = await extractTextFromPdf(req.file.buffer);

    report.filePath = secureUrl;
    report.cloudinaryPublicId = publicId;
    report.extractedText = extractedText;
    report.status = 'analyzed';
    await report.save();
  } catch (error) {
    report.status = 'failed';
    report.errorMessage = error.message || 'Report processing failed';
    await report.save();
    throw error;
  }

  res.status(201).json({ success: true, report });
});

exports.getReportsForPatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;

  await getOwnedPatientOrFail(patientId, req.doctor.id);

  const reports = await Report.find({ patientId }).sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: reports.length, reports });
});

exports.getReportById = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  if (report.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to access this report', 403);
  }

  res.status(200).json({ success: true, report });
});

exports.deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);

  if (!report) {
    throw new AppError('Report not found', 404);
  }

  if (report.doctorId.toString() !== req.doctor.id) {
    throw new AppError('Not authorized to delete this report', 403);
  }

  if (report.cloudinaryPublicId) {
    await deletePdfFromCloudinary(report.cloudinaryPublicId);
  }

  // Cascade delete - a report shouldn't leave orphaned Analysis documents
  // pointing at a reportId that no longer exists.
  await Analysis.deleteMany({ reportId: report._id });

  await report.deleteOne();

  res.status(200).json({ success: true, message: 'Report deleted successfully' });
});