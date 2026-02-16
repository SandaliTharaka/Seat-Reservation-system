const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const User = require('../models/User');
const moment = require('moment');
const sendEmail = require('../utils/sendEmail');
const { createBookingQrToken, verifyBookingQrToken } = require('../utils/qrToken');
const { buildCalendarLinks, createIcsAttachment } = require('../utils/calendar');

const MIN_ADVANCE_MINUTES = 60;

const parseReservationDateTime = (date, timeSlot) => moment(`${date} ${timeSlot}`, 'YYYY-MM-DD HH:mm', true);

const validateReservationInput = (date, timeSlot) => {
  const reservationMoment = parseReservationDateTime(date, timeSlot);
  if (!reservationMoment.isValid()) return 'Invalid date/time slot';

  const now = moment();
  if (reservationMoment.isBefore(now)) return 'Past date/time cannot be booked';
  if (reservationMoment.diff(now, 'minutes') < MIN_ADVANCE_MINUTES) {
    return 'Seats must be reserved at least 1 hour in advance';
  }

  return null;
};

const isFutureBooking = (booking) => parseReservationDateTime(booking.date, booking.timeSlot).isAfter(moment());

const getBookingCalendarContext = (booking, seat) => {
  const start = parseReservationDateTime(booking.date, booking.timeSlot);
  const end = start.clone().add(1, 'hour');
  const title = `Seat Reservation - ${seat.seatNumber}`;
  const description = `Seat ${seat.seatNumber} reserved on ${booking.date} at ${booking.timeSlot}`;
  const location = seat.location || 'Office';

  return {
    title,
    description,
    location,
    start: start.toDate(),
    end: end.toDate(),
    links: buildCalendarLinks({ title, description, location, start: start.toDate(), end: end.toDate() })
  };
};

const addBookingMeta = (bookingDoc) => {
  const booking = bookingDoc.toObject ? bookingDoc.toObject() : bookingDoc;
  const seat = booking.seatId;

  if (seat) {
    const { links } = getBookingCalendarContext(booking, seat);
    booking.calendarLinks = links;
  }

  if (booking.status === 'active' && parseReservationDateTime(booking.date, booking.timeSlot).isAfter(moment())) {
    booking.qrToken = createBookingQrToken(booking);
  }

  booking.checkedIn = Boolean(booking.checkedInAt);
  return booking;
};

const sendBookingConfirmationEmail = async ({ user, seat, booking, subjectPrefix = 'Seat Booking Confirmation' }) => {
  if (!user?.email) return { sent: false, reason: 'no_email' };

  try {
    const calendarCtx = getBookingCalendarContext(booking, seat);
    const attachment = createIcsAttachment({
      uid: `booking-${booking._id}@seat-reservation-system`,
      title: calendarCtx.title,
      description: calendarCtx.description,
      location: calendarCtx.location,
      start: calendarCtx.start,
      end: calendarCtx.end
    });

    await sendEmail(
      user.email,
      subjectPrefix,
      `<p>Hi ${user.name},</p>
       <p>Your seat <strong>${seat.seatNumber}</strong> is booked for <strong>${booking.date}</strong> at <strong>${booking.timeSlot}</strong>.</p>
       <p><a href="${calendarCtx.links.google}">Add to Google Calendar</a> | <a href="${calendarCtx.links.outlook}">Add to Outlook</a></p>`,
      [attachment]
    );
    return { sent: true };
  } catch (error) {
    console.error('Booking confirmation email failed:', error.message);
    return { sent: false, reason: 'send_failed' };
  }
};

exports.bookSeat = async (req, res) => {
  try {
    const { seatId, date, timeSlot } = req.body;
    const userId = req.user.userId;

    const validationError = validateReservationInput(date, timeSlot);
    if (validationError) return res.status(400).json({ message: validationError });

    const seat = await Seat.findById(seatId);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    if (seat.status !== 'available') return res.status(400).json({ message: 'Seat is unavailable' });

    const existing = await Booking.findOne({ seatId, date, timeSlot, status: 'active' });
    if (existing) return res.status(400).json({ message: 'Seat already booked for this time slot' });

    const userBooking = await Booking.findOne({ userId, date, status: 'active' });
    if (userBooking) return res.status(400).json({ message: 'You can reserve only one seat per day' });

    const booking = await Booking.create({ userId, seatId, date, timeSlot });

    let responseBooking = booking;
    try {
      const saved = await Booking.findById(booking._id).populate('seatId');
      responseBooking = addBookingMeta(saved);
    } catch (metaError) {
      console.error('Booking meta generation failed:', metaError.message);
    }

    res.status(201).json({ message: 'Seat booked successfully', booking: responseBooking });

    // Non-blocking side effects after success response
    setImmediate(async () => {
      try {
        const user = await User.findById(userId);
        await sendBookingConfirmationEmail({ user, seat, booking });
      } catch (notifyError) {
        console.error('Booking notification failed:', notifyError.message);
      }
    });
  } catch (err) {
    console.error('Book seat error:', err.message);
    res.status(500).json({ message: 'Booking error', error: err.message });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { seatId, date, timeSlot } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.userId;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.userId.toString() !== userId) return res.status(403).json({ message: 'Not authorized to modify this booking' });
    if (!isFutureBooking(booking)) return res.status(400).json({ message: 'Only future reservations can be modified' });

    const validationError = validateReservationInput(date, timeSlot);
    if (validationError) return res.status(400).json({ message: validationError });

    const seat = await Seat.findById(seatId);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    if (seat.status !== 'available') return res.status(400).json({ message: 'Seat is unavailable' });

    const alreadyBooked = await Booking.findOne({ _id: { $ne: bookingId }, seatId, date, timeSlot, status: 'active' });
    if (alreadyBooked) return res.status(400).json({ message: 'Seat already booked for this time slot' });

    const userBooking = await Booking.findOne({ _id: { $ne: bookingId }, userId, date, status: 'active' });
    if (userBooking) return res.status(400).json({ message: 'You can reserve only one seat per day' });

    booking.seatId = seatId;
    booking.date = date;
    booking.timeSlot = timeSlot;
    booking.checkedInAt = null;
    booking.checkedInBy = null;
    booking.reminder24hSent = false;
    booking.reminder1hSent = false;
    await booking.save();

    const user = await User.findById(userId);
    await sendBookingConfirmationEmail({ user, seat, booking, subjectPrefix: 'Seat Reservation Updated' });

    const saved = await Booking.findById(booking._id).populate('seatId');
    res.json({ message: 'Booking updated successfully', booking: addBookingMeta(saved) });
  } catch (err) {
    res.status(500).json({ message: 'Error updating booking', error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('userId seatId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const requesterId = req.user.userId;
    const isOwner = booking.userId?._id?.toString() === requesterId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    if (!isAdmin && !isFutureBooking(booking)) return res.status(400).json({ message: 'Only future reservations can be cancelled' });

    booking.status = 'cancelled';
    await booking.save();

    const user = booking.userId;
    const seatNumber = booking.seatId?.seatNumber || 'Unknown';
    if (user?.email) {
      try {
        await sendEmail(
          user.email,
          'Booking Cancellation Notice',
          `<p>Hi ${user.name},</p>
           <p>Your booking for seat <strong>${seatNumber}</strong> on <strong>${booking.date}</strong> at <strong>${booking.timeSlot}</strong> has been cancelled.</p>`
        );
      } catch (error) {
        console.error('Cancellation email failed:', error.message);
      }
    }

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Cancel error', error: err.message });
  }
};

exports.getBookingsByDate = async (req, res) => {
  try {
    const { date, timeSlot } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const filter = { date, status: 'active' };
    if (timeSlot) filter.timeSlot = timeSlot;

    let query = Booking.find(filter).populate('seatId');
    if (req.user?.role === 'admin') query = query.populate('userId checkedInBy');

    const bookings = await query;
    res.json(bookings.map(addBookingMeta));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.userId })
      .populate('seatId checkedInBy')
      .sort({ date: -1, timeSlot: -1, createdAt: -1 });

    res.json(bookings.map(addBookingMeta));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user bookings' });
  }
};

exports.getBookingsByUserEmail = async (req, res) => {
  const { email } = req.query;

  try {
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const bookings = await Booking.find({ userId: user._id })
      .populate('seatId userId checkedInBy')
      .sort({ date: -1, timeSlot: -1, createdAt: -1 });

    res.json(bookings.map(addBookingMeta));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings by user' });
  }
};

exports.getSeatUsage = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'active' }).populate('seatId');
    const seatUsage = {};

    bookings.forEach((booking) => {
      const key = booking.seatId?.seatNumber || 'Unknown';
      seatUsage[key] = (seatUsage[key] || 0) + 1;
    });

    res.json(seatUsage);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get stats' });
  }
};

exports.assignSeatByAdmin = async (req, res) => {
  try {
    const { email, seatId, date, timeSlot } = req.body;

    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user || user.role !== 'intern') return res.status(404).json({ message: 'Intern not found' });

    const validationError = validateReservationInput(date, timeSlot);
    if (validationError) return res.status(400).json({ message: validationError });

    const seat = await Seat.findById(seatId);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    if (seat.status !== 'available') return res.status(400).json({ message: 'Seat is unavailable' });

    const existing = await Booking.findOne({ seatId, date, timeSlot, status: 'active' });
    if (existing) return res.status(400).json({ message: 'Seat already booked for this time slot' });

    const userBooking = await Booking.findOne({ userId: user._id, date, status: 'active' });
    if (userBooking) return res.status(400).json({ message: 'Intern already has a booking for this date' });

    const booking = await Booking.create({ userId: user._id, seatId, date, timeSlot, status: 'active' });
    await sendBookingConfirmationEmail({ user, seat, booking, subjectPrefix: 'Seat Assigned by Admin' });

    const saved = await Booking.findById(booking._id).populate('seatId userId');
    res.status(201).json({ message: 'Seat assigned successfully', booking: addBookingMeta(saved) });
  } catch (err) {
    res.status(500).json({ message: 'Error assigning seat', error: err.message });
  }
};

exports.getBookingQrToken = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = booking.userId.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    if (booking.status !== 'active') return res.status(400).json({ message: 'Only active bookings have QR check-in' });

    const qrToken = createBookingQrToken(booking);
    res.json({ qrToken, bookingId: booking._id });
  } catch (err) {
    res.status(500).json({ message: 'QR token error', error: err.message });
  }
};

exports.checkInByQr = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ message: 'QR token is required' });

    const payload = verifyBookingQrToken(qrToken);
    if (payload.type !== 'booking_checkin') return res.status(400).json({ message: 'Invalid QR token' });

    const booking = await Booking.findById(payload.bookingId).populate('seatId userId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'active') return res.status(400).json({ message: 'Booking is not active' });
    if (booking.checkedInAt) return res.status(400).json({ message: 'Booking already checked in' });

    const reservationTime = parseReservationDateTime(booking.date, booking.timeSlot);
    const allowedFrom = reservationTime.clone().subtract(30, 'minutes');
    const allowedUntil = reservationTime.clone().add(2, 'hours');
    const now = moment();

    if (now.isBefore(allowedFrom) || now.isAfter(allowedUntil)) {
      return res.status(400).json({ message: 'Check-in is allowed from 30 minutes before to 2 hours after slot time' });
    }

    booking.checkedInAt = new Date();
    booking.checkedInBy = req.user.userId;
    await booking.save();

    res.json({ message: 'Check-in successful', booking: addBookingMeta(booking) });
  } catch (err) {
    res.status(400).json({ message: 'Invalid or expired QR token' });
  }
};

exports.downloadBookingIcs = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('seatId userId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isOwner = booking.userId?._id?.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    const calendarCtx = getBookingCalendarContext(booking, booking.seatId);
    const attachment = createIcsAttachment({
      uid: `booking-${booking._id}@seat-reservation-system`,
      title: calendarCtx.title,
      description: calendarCtx.description,
      location: calendarCtx.location,
      start: calendarCtx.start,
      end: calendarCtx.end
    });

    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="seat-reservation.ics"');
    res.send(attachment.content);
  } catch (err) {
    res.status(500).json({ message: 'Calendar export failed', error: err.message });
  }
};
