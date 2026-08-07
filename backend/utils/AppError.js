class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes "expected" errors from unexpected bugs

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;