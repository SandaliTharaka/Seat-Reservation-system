import React from 'react';
import './SeatGrid.css';

const SeatGrid = ({ seats, bookings, onBook }) => {
  const isBooked = (seatId) => bookings.some((booking) => booking.seatId === seatId || booking.seatId?._id === seatId);

  return (
    <div className="seat-grid">
      {seats.map((seat) => {
        const booked = isBooked(seat._id);
        const unavailable = seat.status === 'unavailable';
        const variant = unavailable ? 'unavailable' : booked ? 'booked' : 'available';
        const disabled = booked || unavailable;

        return (
          <button
            key={seat._id}
            onClick={() => onBook(seat._id)}
            disabled={disabled}
            title={unavailable ? 'Unavailable' : booked ? 'Booked' : 'Click to reserve'}
            className={`seat-btn ${variant}`}
          >
            {seat.seatNumber}
          </button>
        );
      })}
    </div>
  );
};

export default SeatGrid;
