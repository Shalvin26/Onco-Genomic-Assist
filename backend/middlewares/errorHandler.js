

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let isOperational = err.isOperational || false;


  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && 'body' in err)) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    isOperational = true;
  }

  // Mongoose bad ObjectId (e.g. malformed :id in a route param)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field: ${err.path}`;
    isOperational = true;
  }

  // Mongoose validation errors (e.g. required field missing)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    isOperational = true;
  }

  // Mongoose duplicate key error (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
    isOperational = true;
  }

  // Multer file upload errors (e.g. file too large)
if (err.name === 'MulterError') {
  statusCode = 400;
  isOperational = true;
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File size is too large. Maximum limit is 10MB.';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = `Unexpected file field: "${err.field}". Expected field name is "reportFile".`;
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files uploaded. Only one file is allowed.';
      break;
    default:
      message = 'File upload error: ' + err.message;
  }
}

  // JWT errors that slip through outside our own auth middleware's try/catch
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired session. Please log in again.';
    isOperational = true;
  }

  // Log unexpected (non-operational) errors loudly for debugging
  if (!isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace for genuinely unexpected errors, and only in development
    ...(process.env.NODE_ENV === 'development' && !isOperational && { stack: err.stack }),
  });
};

module.exports = errorHandler;