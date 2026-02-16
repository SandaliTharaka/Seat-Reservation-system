const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seatController');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');

// Admin only
router.post('/', auth, isAdmin, seatController.createSeat);
router.post('/seed-default', auth, isAdmin, seatController.seedDefaultSeats);
router.put('/:id', auth, isAdmin, seatController.updateSeat);
router.delete('/:id', auth, isAdmin, seatController.deleteSeat);

// Public
router.get('/', seatController.getAllSeats);

module.exports = router;
