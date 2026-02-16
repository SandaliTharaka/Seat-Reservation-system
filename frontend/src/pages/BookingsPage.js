import React, { useEffect, useState } from 'react';
import API from '../api/api';
import moment from 'moment';
import { QRCodeCanvas } from 'qrcode.react';
import './BookingsPage.css';

const TIME_SLOT_OPTIONS = ['09:00', '11:00', '13:00', '15:00', '17:00'];

const getReservationMoment = (booking) => moment(`${booking.date} ${booking.timeSlot}`, 'YYYY-MM-DD HH:mm', true);

const BookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [seats, setSeats] = useState([]);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editSeat, setEditSeat] = useState('');
  const [editTimeSlot, setEditTimeSlot] = useState(TIME_SLOT_OPTIONS[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [seatRes, bookingRes] = await Promise.all([API.get('/seats'), API.get('/bookings/my')]);
      setSeats(seatRes.data.filter((seat) => seat.status === 'available'));
      setBookings(bookingRes.data);
      setIsError(false);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to load bookings');
    }
  };

  const isFutureActive = (booking) => booking.status === 'active' && getReservationMoment(booking).isAfter(moment());

  const getDisplayStatus = (booking) => {
    if (booking.status === 'cancelled') return 'cancelled';
    return getReservationMoment(booking).isBefore(moment()) ? 'past' : 'currentfuture';
  };

  const getDisplayText = (status) => {
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'past') return 'Past';
    return 'Current/Future';
  };

  const startEdit = (booking) => {
    setEditingId(booking._id);
    setEditDate(booking.date);
    setEditSeat(booking.seatId?._id || '');
    setEditTimeSlot(booking.timeSlot || TIME_SLOT_OPTIONS[0]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDate('');
    setEditSeat('');
    setEditTimeSlot(TIME_SLOT_OPTIONS[0]);
  };

  const handleSave = async () => {
    try {
      await API.put(`/bookings/${editingId}`, { date: editDate, seatId: editSeat, timeSlot: editTimeSlot });
      setMessage('Reservation updated successfully');
      setIsError(false);
      cancelEdit();
      fetchData();
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to update reservation');
    }
  };

  const handleCancel = async (id) => {
    try {
      await API.patch(`/bookings/${id}/cancel`);
      setMessage('Reservation cancelled');
      setIsError(false);
      fetchData();
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to cancel reservation');
    }
  };

  const handleDownloadIcs = async (bookingId) => {
    try {
      const res = await API.get(`/bookings/${bookingId}/calendar.ics`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/calendar' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'seat-reservation.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to download calendar file');
    }
  };

  return (
    <div className="app-shell">
      <div className="page-card">
        <h2 className="section-title">My Reservations</h2>
        {message && <p className={`feedback ${isError ? 'error' : ''}`}>{message}</p>}

        {bookings.length === 0 ? (
          <p className="reservation-empty">No reservations found.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Seat No</th>
                  <th>Location</th>
                  <th>Calendar</th>
                  <th>QR</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const status = getDisplayStatus(booking);
                  return (
                    <tr key={booking._id}>
                      <td>
                        {editingId === booking._id ? (
                          <input className="inline-input" type="date" min={moment().format('YYYY-MM-DD')} value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                        ) : (
                          booking.date
                        )}
                      </td>
                      <td>
                        {editingId === booking._id ? (
                          <select className="inline-input" value={editTimeSlot} onChange={(e) => setEditTimeSlot(e.target.value)}>
                            {TIME_SLOT_OPTIONS.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        ) : (
                          booking.timeSlot || '-'
                        )}
                      </td>
                      <td>
                        {editingId === booking._id ? (
                          <select className="inline-input" value={editSeat} onChange={(e) => setEditSeat(e.target.value)}>
                            <option value="">Select seat</option>
                            {seats.map((seat) => (
                              <option key={seat._id} value={seat._id}>{seat.seatNumber}</option>
                            ))}
                          </select>
                        ) : (
                          booking.seatId?.seatNumber || '-'
                        )}
                      </td>
                      <td>{booking.seatId?.location || '-'}</td>
                      <td>
                        {booking.calendarLinks ? (
                          <div className="action-group">
                            <a className="inline-link" href={booking.calendarLinks.google} target="_blank" rel="noreferrer">Google</a>
                            <a className="inline-link" href={booking.calendarLinks.outlook} target="_blank" rel="noreferrer">Outlook</a>
                            <button type="button" className="inline-link inline-link-btn" onClick={() => handleDownloadIcs(booking._id)}>ICS</button>
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        {booking.status === 'active' && booking.qrToken ? (
                          <QRCodeCanvas value={booking.qrToken} size={68} />
                        ) : '-'}
                      </td>
                      <td><span className={`status-pill ${status}`}>{getDisplayText(status)}</span></td>
                      <td>
                        {editingId === booking._id ? (
                          <div className="action-group">
                            <button className="inline-btn primary" onClick={handleSave}>Save</button>
                            <button className="inline-btn secondary" onClick={cancelEdit}>Cancel</button>
                          </div>
                        ) : isFutureActive(booking) ? (
                          <div className="action-group">
                            <button className="inline-btn primary" onClick={() => startEdit(booking)}>Modify</button>
                            <button className="inline-btn danger" onClick={() => handleCancel(booking._id)}>Cancel</button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;
