const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  term: { type: String, required: true },
  grade: { type: String, required: true, enum: ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F', 'W'] }
});

module.exports = mongoose.model('Record', recordSchema);