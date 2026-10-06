const mongoose = require('mongoose');

const offeringSchema = new mongoose.Schema({
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  term: { type: String, required: true },
  section: { type: Number, required: true },
  day: { type: String, required: true },
  startTime: { type: String, required: true }, // Format: "09:00"
  endTime: { type: String, required: true },   // Format: "12:00"
  room: { type: String, required: true },
  instructor: { type: String, required: true },
  seats: { type: Number, required: true },
  seatsTaken: { type: Number, default: 0 },
  addDropOpen: { type: Boolean, default: false },
  addDropCloseDate: { type: Date, default: null     //  added Opening and Close date (Min)
}
});

module.exports = mongoose.model('Offering', offeringSchema);