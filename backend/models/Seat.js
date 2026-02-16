const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true, unique: true }, // e.g., A1, B2
  location: { type: String, required: true },                 // e.g., Floor 1
  description: String,
  status: { type: String, enum: ['available', 'unavailable'], default: 'available' }
});

module.exports = mongoose.model('Seat', seatSchema);
