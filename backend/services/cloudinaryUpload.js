const cloudinary = require('../config/cloudinary');
const AppError = require('../utils/AppError');

const uploadPdfToCloudinary = (fileBuffer, doctorId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        folder: `genomic-platform/reports/${doctorId}`,
        public_id: `report_${Date.now()}`,
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new AppError('Failed to upload file to Cloudinary', 502));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

const deletePdfFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (error) {
    console.error('Failed to delete file from Cloudinary:', error.message);
  }
};

module.exports = { uploadPdfToCloudinary, deletePdfFromCloudinary };