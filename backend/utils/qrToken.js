const jwt = require('jsonwebtoken');

const getExpirySeconds = (booking) => {
  const bookingDateTime = new Date(`${booking.date}T${booking.timeSlot}:00`);
  const expiresAt = new Date(bookingDateTime.getTime() + 2 * 60 * 60 * 1000); // valid until 2h after slot
  return Math.floor(expiresAt.getTime() / 1000);
};

const createBookingQrToken = (booking) =>
  jwt.sign(
    {
      type: 'booking_checkin',
      bookingId: booking._id.toString(),
      userId: booking.userId.toString()
    },
    process.env.JWT_SECRET,
    { expiresIn: Math.max(getExpirySeconds(booking) - Math.floor(Date.now() / 1000), 60) }
  );

const verifyBookingQrToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  createBookingQrToken,
  verifyBookingQrToken
};
