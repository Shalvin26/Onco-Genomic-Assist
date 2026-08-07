const cloudinary = require('cloudinary').v2;

// Centralized Cloudinary config - single source of truth.
// Reads credentials from environment variables, never hardcoded.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // always return https URLs
});

module.exports = cloudinary;