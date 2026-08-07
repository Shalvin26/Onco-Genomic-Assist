const mongoose = require('mongoose');

const medicalNewsSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    source: { type: String, required: true },
    url: { type: String, required: true },
    tag: {
      type: String,
      enum: ['Research', 'Clinical Trial', 'FDA / Drug Update'],
      default: 'Research',
    },
    publishedAt: { type: String },
    timestamp: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MedicalNews', medicalNewsSchema);