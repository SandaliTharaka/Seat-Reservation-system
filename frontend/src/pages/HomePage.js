import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import SeatGrid from '../components/SeatGrid';
import moment from 'moment';
import './HomePage.css';

const TIME_SLOT_OPTIONS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

const HomePage = () => {
  const [seats, setSeats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [date, setDate] = useState(moment().format('YYYY-MM-DD'));
  const [timeSlot, setTimeSlot] = useState(TIME_SLOT_OPTIONS[0]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const fetchSeats = useCallback(async () => {
    try {
      const res = await API.get('/seats');
      setSeats(res.data);
    } catch (err) {
      console.error('Error fetching seats', err);
    }
  }, []);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await API.get(`/bookings/by-date?date=${date}&timeSlot=${timeSlot}`);
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching bookings', err);
    }
  }, [date, timeSlot]);

  useEffect(() => {
    fetchSeats();
    fetchBookings();
  }, [fetchSeats, fetchBookings]);

  const handleBook = async (seatId) => {
    if (isBooking) return;
    setIsBooking(true);
    try {
      await API.post('/bookings', { seatId, date, timeSlot });
      setMessage('Reservation created successfully');
      setIsError(false);
      fetchBookings();
    } catch (err) {
      // Fallback for false-negative API errors: confirm whether booking actually exists for current user.
      try {
        const myRes = await API.get('/bookings/my');
        const created = myRes.data?.some(
          (booking) =>
            booking.status === 'active' &&
            booking.date === date &&
            booking.timeSlot === timeSlot &&
            (booking.seatId?._id === seatId || booking.seatId === seatId)
        );

        if (created) {
          setMessage('Reservation created successfully');
          setIsError(false);
          fetchBookings();
        } else {
          setMessage(err.response?.data?.message || 'Booking failed');
          setIsError(true);
        }
      } catch {
        setMessage(err.response?.data?.message || 'Booking failed');
        setIsError(true);
      }
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card">
        <h2 className="section-title">Book a Seat</h2>

        {message && <p className={`feedback ${isError ? 'error' : ''}`}>{message}</p>}

        <div className="home-meta">
          <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} min={moment().format('YYYY-MM-DD')} />
          <select className="select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            {TIME_SLOT_OPTIONS.map((slot) => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>

        <div className="seat-legend">
          <span className="legend-chip"><span className="legend-dot available" />Available</span>
          <span className="legend-chip"><span className="legend-dot booked" />Booked</span>
          <span className="legend-chip"><span className="legend-dot unavailable" />Unavailable</span>
        </div>

        <SeatGrid seats={seats} bookings={bookings} onBook={handleBook} />
      </div>
    </div>
  );
};

export default HomePage;
