const Seat = require('../models/Seat');
const Booking = require('../models/Booking');

exports.createSeat = async (req, res) => {
  try {
    const { seatNumber, location, description, status } = req.body;
    const seat = new Seat({ seatNumber, location, description, status });
    await seat.save();
    res.status(201).json(seat);
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    const message = isDuplicate ? 'Seat number already exists' : 'Error creating seat';
    res.status(isDuplicate ? 400 : 500).json({ message, error: err.message });
  }
};

exports.getAllSeats = async (req, res) => {
  try {
    const seats = await Seat.find();
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching seats' });
  }
};

exports.updateSeat = async (req, res) => {
  try {
    const { seatNumber, location, description, status } = req.body;
    const seat = await Seat.findByIdAndUpdate(
      req.params.id,
      { seatNumber, location, description, status },
      { new: true, runValidators: true }
    );

    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    res.json(seat);
  } catch (err) {
    const isDuplicate = err?.code === 11000;
    const message = isDuplicate ? 'Seat number already exists' : 'Error updating seat';
    res.status(isDuplicate ? 400 : 500).json({ message, error: err.message });
  }
};

exports.deleteSeat = async (req, res) => {
  try {
    const activeBooking = await Booking.findOne({ seatId: req.params.id, status: 'active' });
    if (activeBooking) {
      return res.status(400).json({ message: 'Cannot delete seat with active bookings' });
    }

    const seat = await Seat.findByIdAndDelete(req.params.id);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting seat', error: err.message });
  }
};

exports.seedDefaultSeats = async (req, res) => {
  try {
    const generated = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
    const perRow = 8;

    rows.forEach((row, rowIndex) => {
      for (let i = 1; i <= perRow; i += 1) {
        generated.push({
          updateOne: {
            filter: { seatNumber: `${row}${i}` },
            update: {
              $setOnInsert: {
                seatNumber: `${row}${i}`,
                location: rowIndex < 3 ? 'Floor 1' : 'Floor 2',
                description: `Zone ${row}`,
                status: 'available'
              }
            },
            upsert: true
          }
        });
      }
    });

    const result = await Seat.bulkWrite(generated, { ordered: false });
    const insertedCount = result?.upsertedCount || 0;
    const totalSeats = await Seat.countDocuments();

    res.json({
      message: `Default seats seeded. Added ${insertedCount} seats.`,
      insertedCount,
      totalSeats
    });
  } catch (err) {
    res.status(500).json({ message: 'Error seeding seats', error: err.message });
  }
};
