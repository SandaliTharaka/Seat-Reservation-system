const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seat' },
  date: { type: String, required: true }, // store as "YYYY-MM-DD"
  timeSlot: { type: String, required: true }, // store as "HH:mm"
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reminder24hSent: { type: Boolean, default: false },
  reminder1hSent: { type: Boolean, default: false }
}, { timestamps: true });

bookingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 15552000 });

module.exports = mongoose.model('Booking', bookingSchema);
