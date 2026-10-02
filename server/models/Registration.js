const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  offeringId: { type: mongoose.Schema.Types.ObjectId, ref: 'Offering', required: true },
  term: { type: String, required: true },
  status: { type: String, enum: ['registered', 'dropped'], default: 'registered' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Registration', registrationSchema);