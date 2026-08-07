const jwt = require('jsonwebtoken');

const sendTokenResponse = (doctor, statusCode, res) => {
  const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    doctor: {
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      specialization: doctor.specialization,
      institution: doctor.institution,
      role: doctor.role,
    },
  });
};

module.exports = sendTokenResponse;