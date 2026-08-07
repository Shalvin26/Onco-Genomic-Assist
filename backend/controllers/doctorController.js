const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Report = require('../models/Report');
const Analysis = require('../models/Analysis');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');

exports.getProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.doctor.id);
  if (!doctor) throw new AppError('Doctor not found', 404);
  res.status(200).json({ success: true, doctor });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.doctor.id);
  if (!doctor) throw new AppError('Doctor not found', 404);

  const { name, specialization, institution } = req.body;
  if (name !== undefined) doctor.name = name;
  if (specialization !== undefined) doctor.specialization = specialization;
  if (institution !== undefined) doctor.institution = institution;

  await doctor.save();
  res.status(200).json({ success: true, doctor });
});

exports.getDashboard = asyncHandler(async (req, res) => {
  const doctorId = req.doctor.id;

  const [totalPatients, totalReports, reportsPendingAnalysis, recentAnalyses, pendingReviewCount] =
    await Promise.all([
      Patient.countDocuments({ doctorId }),
      Report.countDocuments({ doctorId }),
      Report.countDocuments({ doctorId, status: { $in: ['uploaded', 'processing'] } }),
      Analysis.find({ doctorId, isLatest: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('patientId', 'name patientIdentifier')
       .select('reportId patientId geneAnalyses reviewStatus createdAt'),
      Analysis.countDocuments({ doctorId, isLatest: true, reviewStatus: 'pending_review' }),
    ]);

  res.status(200).json({
    success: true,
    stats: { totalPatients, totalReports, reportsPendingAnalysis, pendingReviewCount },
    recentAnalyses,
  });
});