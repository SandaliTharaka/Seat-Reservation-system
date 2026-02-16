const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const auth = require("../middleware/auth");
const isAdmin = require("../middleware/isAdmin");

// Intern routes (require login)
router.post("/", auth, bookingController.bookSeat);
router.patch("/:id/cancel", auth, bookingController.cancelBooking);
router.put('/:id', auth, bookingController.updateBooking);
router.get('/my', auth, bookingController.getMyBookings);
router.get("/by-date", auth, bookingController.getBookingsByDate);
router.get('/:id/qr-token', auth, bookingController.getBookingQrToken);
router.get('/:id/calendar.ics', auth, bookingController.downloadBookingIcs);

router.get("/admin/by-user", auth, isAdmin, bookingController.getBookingsByUserEmail);
router.get('/admin/seat-usage', auth, isAdmin, bookingController.getSeatUsage);
router.post('/admin/assign', auth, isAdmin, bookingController.assignSeatByAdmin);
router.post('/admin/check-in', auth, isAdmin, bookingController.checkInByQr);


module.exports = router;
