const jwt = require('jsonwebtoken');
const asyncHandler = require('./asyncHandler');
const AppError = require('../utils/AppError');

// Protects routes by verifying the JWT stored in the httpOnly cookie.
// On success, attaches { id } to req.doctor so controllers know who's asking.
//
// Usage:
//   router.get('/dashboard', verifyToken, doctorController.getDashboard);

const verifyToken = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    throw new AppError('Not authenticated. Please log in.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.doctor = { id: decoded.id };
    next();
  } catch (err) {
    // Covers both expired and malformed/tampered tokens
    throw new AppError('Session expired or invalid. Please log in again.', 401);
  }
});

module.exports = verifyToken;