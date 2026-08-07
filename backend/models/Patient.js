const mongoose = require('mongoose');

const noteEntrySchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const patientSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  name: { type: String, required: true, trim: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other', 'unspecified'], default: 'unspecified' },
  patientIdentifier: { type: String, trim: true, default: '' },
  notes: [noteEntrySchema],
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);