const Doctor = require('../models/Doctor');
const asyncHandler = require('../middlewares/asyncHandler');
const AppError = require('../utils/AppError');
const sendTokenResponse = require('../utils/sendTokenResponse');

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, specialization, institution } = req.body;

  if (!name || !email || !password) {
    throw new AppError('Name, email, and password are required', 400);
  }

  const existingDoctor = await Doctor.findOne({ email });
  if (existingDoctor) {
    throw new AppError('An account with this email already exists', 400);
  }

  const doctor = await Doctor.create({ name, email, password, specialization, institution });
  sendTokenResponse(doctor, 201, res);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const doctor = await Doctor.findOne({ email }).select('+password');
  if (!doctor) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await doctor.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  sendTokenResponse(doctor, 200, res);
});

exports.logout = asyncHandler(async (req, res) => {
  res.cookie('token', 'none', {
    httpOnly: true,
    expires: new Date(Date.now() + 5 * 1000),
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

exports.getMe = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(req.doctor.id);
  if (!doctor) {
    throw new AppError('Doctor not found', 404);
  }
  res.status(200).json({ success: true, doctor });
});