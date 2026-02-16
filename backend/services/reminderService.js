const moment = require('moment');
const Booking = require('../models/Booking');
const sendEmail = require('../utils/sendEmail');
const sendSms = require('../utils/sendSms');
const { createIcsAttachment } = require('../utils/calendar');

const CHECK_INTERVAL_MINUTES = 5;
let reminderTimer = null;

const shouldSendReminder = (reservationMoment, minutesBefore) => {
  const now = moment();
  const diff = reservationMoment.diff(now, 'minutes');
  return diff <= minutesBefore && diff > minutesBefore - CHECK_INTERVAL_MINUTES;
};

const runReminderSweep = async () => {
  try {
    const today = moment().subtract(1, 'day').format('YYYY-MM-DD');
    const bookings = await Booking.find({ status: 'active', date: { $gte: today } }).populate('userId seatId');

    for (const booking of bookings) {
      const reservationMoment = moment(`${booking.date} ${booking.timeSlot}`, 'YYYY-MM-DD HH:mm', true);
      if (!reservationMoment.isValid() || reservationMoment.isBefore(moment())) continue;

      const user = booking.userId;
      const seat = booking.seatId;
      if (!user || !seat) continue;

      const title = `Seat Reservation - ${seat.seatNumber}`;
      const description = `Reminder: You reserved seat ${seat.seatNumber} at ${seat.location} on ${booking.date} ${booking.timeSlot}.`;
      const start = reservationMoment.toDate();
      const end = reservationMoment.clone().add(1, 'hour').toDate();
      const calendarAttachment = createIcsAttachment({
        uid: `booking-${booking._id}@seat-reservation-system`,
        title,
        description,
        location: seat.location,
        start,
        end
      });

      if (!booking.reminder24hSent && shouldSendReminder(reservationMoment, 24 * 60)) {
        await sendEmail(
          user.email,
          'Reminder: Your seat reservation is in 24 hours',
          `<p>Hi ${user.name},</p><p>${description}</p>`,
          [calendarAttachment]
        );
        if (user.phone) await sendSms(user.phone, `Seat reminder: ${seat.seatNumber} on ${booking.date} ${booking.timeSlot}.`);
        booking.reminder24hSent = true;
      }

      if (!booking.reminder1hSent && shouldSendReminder(reservationMoment, 60)) {
        await sendEmail(
          user.email,
          'Reminder: Your seat reservation starts in 1 hour',
          `<p>Hi ${user.name},</p><p>${description}</p>`
        );
        if (user.phone) await sendSms(user.phone, `Seat starts in 1 hour: ${seat.seatNumber} at ${booking.timeSlot}.`);
        booking.reminder1hSent = true;
      }

      if (booking.isModified()) {
        await booking.save();
      }
    }
  } catch (err) {
    console.error('Reminder service error:', err.message);
  }
};

const startReminderService = () => {
  if (reminderTimer) return;
  reminderTimer = setInterval(runReminderSweep, CHECK_INTERVAL_MINUTES * 60 * 1000);
  runReminderSweep();
  console.log('Reminder service started');
};

module.exports = { startReminderService };
