const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      index: true, //helps in faster searching of report to particular doctor 
      // it is the key method to solve method of populating.
    },
    originalFileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String, // Cloudinary secure URL 
    },
    cloudinaryPublicId: {
      type: String,
      default: '',
    },
    extractedText: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'failed'],
      default: 'uploaded',
    },
    errorMessage: {
      type: String, // populated only when status === 'failed'
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);