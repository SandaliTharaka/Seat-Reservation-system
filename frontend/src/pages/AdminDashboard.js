import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js';
import jsPDF from 'jspdf';
import './AdminDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement);

const TIME_SLOT_OPTIONS = ['09:00', '11:00', '13:00', '15:00', '17:00'];
const emptySeatForm = { seatNumber: '', location: '', description: '', status: 'available' };
const emptyAssignForm = { email: '', seatId: '', date: '', timeSlot: TIME_SLOT_OPTIONS[0] };

const AdminDashboard = () => {
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [bookings, setBookings] = useState([]);
  const [seats, setSeats] = useState([]);
  const [seatForm, setSeatForm] = useState(emptySeatForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [editingSeatId, setEditingSeatId] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [chartData, setChartData] = useState(null);
  const [report, setReport] = useState(null);
  const [qrTokenInput, setQrTokenInput] = useState('');
  const totalSeats = seats.length;
  const availableSeats = seats.filter((seat) => seat.status === 'available').length;
  const unavailableSeats = seats.filter((seat) => seat.status === 'unavailable').length;
  const loadedReservations = bookings.length;

  useEffect(() => {
    loadSeats();
    loadChart();
  }, []);

  const loadSeats = async () => {
    try {
      const res = await API.get('/seats');
      setSeats(res.data);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to load seats');
    }
  };

  const loadChart = async () => {
    try {
      const res = await API.get('/bookings/admin/seat-usage');
      setChartData({
        labels: Object.keys(res.data),
        datasets: [{ label: 'Seat usage', data: Object.values(res.data), backgroundColor: '#0b3a78' }]
      });
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to load chart');
    }
  };

  const setSuccess = (text) => {
    setIsError(false);
    setMessage(text);
  };

  const resetSeatForm = () => {
    setSeatForm(emptySeatForm);
    setEditingSeatId(null);
  };

  const handleSeatSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSeatId) {
        await API.put(`/seats/${editingSeatId}`, seatForm);
        setSuccess('Seat updated successfully');
      } else {
        await API.post('/seats', seatForm);
        setSuccess('Seat added successfully');
      }
      resetSeatForm();
      await Promise.all([loadSeats(), loadChart()]);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to save seat');
    }
  };

  const handleSeatEdit = (seat) => {
    setEditingSeatId(seat._id);
    setSeatForm({
      seatNumber: seat.seatNumber,
      location: seat.location,
      description: seat.description || '',
      status: seat.status || 'available'
    });
  };

  const handleSeatDelete = async (seatId) => {
    try {
      await API.delete(`/seats/${seatId}`);
      setSuccess('Seat deleted successfully');
      await Promise.all([loadSeats(), loadChart()]);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to delete seat');
    }
  };

  const handleSeedSeats = async () => {
    try {
      const res = await API.post('/seats/seed-default');
      setSuccess(res.data.message || 'Seats seeded');
      await Promise.all([loadSeats(), loadChart()]);
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to seed seats');
    }
  };

  const handleSearchByEmail = async () => {
    try {
      const res = await API.get(`/bookings/admin/by-user?email=${email}`);
      setBookings(res.data);
      setSuccess('Results loaded');
    } catch (err) {
      setBookings([]);
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to fetch bookings by email');
    }
  };

  const handleSearchByDate = async () => {
    try {
      const query = timeSlot ? `/bookings/by-date?date=${date}&timeSlot=${timeSlot}` : `/bookings/by-date?date=${date}`;
      const res = await API.get(query);
      setBookings(res.data);
      setSuccess('Results loaded');
    } catch (err) {
      setBookings([]);
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to fetch bookings by date');
    }
  };

  const handleAssignSeat = async (e) => {
    e.preventDefault();
    try {
      await API.post('/bookings/admin/assign', assignForm);
      setSuccess('Seat assigned successfully');
      setAssignForm(emptyAssignForm);
      await loadChart();
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to assign seat');
    }
  };

  const handleQrCheckIn = async (e) => {
    e.preventDefault();
    try {
      await API.post('/bookings/admin/check-in', { qrToken: qrTokenInput.trim() });
      setSuccess('Check-in successful');
      setQrTokenInput('');
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Check-in failed');
    }
  };

  const generateReport = async () => {
    try {
      const usageRes = await API.get('/bookings/admin/seat-usage');
      const seatsRes = await API.get('/seats');
      const usage = usageRes.data;
      const topSeat = Object.entries(usage).sort((a, b) => b[1] - a[1])[0];

      setReport({
        totalSeats: seatsRes.data.length,
        availableSeats: seatsRes.data.filter((s) => s.status === 'available').length,
        totalBookings: Object.values(usage).reduce((sum, n) => sum + n, 0),
        mostBooked: topSeat ? `${topSeat[0]} (${topSeat[1]})` : 'N/A'
      });
      setSuccess('Report generated');
    } catch (err) {
      setIsError(true);
      setMessage(err.response?.data?.message || 'Failed to generate report');
    }
  };

  const downloadReport = () => {
    if (!report) return;

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Seat Reservation Report', 20, 20);
    doc.setFontSize(12);
    doc.text(`Total seats: ${report.totalSeats}`, 20, 40);
    doc.text(`Available seats: ${report.availableSeats}`, 20, 50);
    doc.text(`Total bookings: ${report.totalBookings}`, 20, 60);
    doc.text(`Most booked seat: ${report.mostBooked}`, 20, 70);
    doc.save('seat-reservation-report.pdf');
  };

  return (
    <div className="app-shell">
      <div className="page-card admin-grid">
        <h2 className="section-title">Admin Dashboard</h2>
        {message && <p className={`feedback ${isError ? 'error' : ''}`}>{message}</p>}

        <section className="admin-kpis">
          <article className="kpi-card">
            <h4>Total Seats</h4>
            <p>{totalSeats}</p>
          </article>
          <article className="kpi-card">
            <h4>Available</h4>
            <p>{availableSeats}</p>
          </article>
          <article className="kpi-card">
            <h4>Unavailable</h4>
            <p>{unavailableSeats}</p>
          </article>
          <article className="kpi-card">
            <h4>Results Loaded</h4>
            <p>{loadedReservations}</p>
          </article>
        </section>

        <section className="admin-section">
          <h3 className="section-title">Manage Seats</h3>
          <form className="form-row" onSubmit={handleSeatSubmit}>
            <input className="field" placeholder="Seat Number" value={seatForm.seatNumber} onChange={(e) => setSeatForm({ ...seatForm, seatNumber: e.target.value })} required />
            <input className="field" placeholder="Location" value={seatForm.location} onChange={(e) => setSeatForm({ ...seatForm, location: e.target.value })} required />
            <input className="field" placeholder="Description" value={seatForm.description} onChange={(e) => setSeatForm({ ...seatForm, description: e.target.value })} />
            <select className="select" value={seatForm.status} onChange={(e) => setSeatForm({ ...seatForm, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <button type="submit" className="btn btn-primary">{editingSeatId ? 'Update Seat' : 'Add Seat'}</button>
            {editingSeatId && <button type="button" className="btn btn-secondary" onClick={resetSeatForm}>Cancel Edit</button>}
            <button type="button" className="btn btn-success" onClick={handleSeedSeats}>Seed 48 Seats</button>
          </form>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Seat No</th>
                  <th>Location</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((seat) => (
                  <tr key={seat._id}>
                    <td>{seat.seatNumber}</td>
                    <td>{seat.location}</td>
                    <td>{seat.description || '-'}</td>
                    <td><span className={`status-pill ${seat.status}`}>{seat.status}</span></td>
                    <td>
                      <div className="cell-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSeatEdit(seat)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleSeatDelete(seat._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <h3 className="section-title">Reservations</h3>
          <div className="form-row search-row">
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              <option value="">All time slots</option>
              {TIME_SLOT_OPTIONS.map((slot) => (<option key={slot} value={slot}>{slot}</option>))}
            </select>
            <button className="btn btn-primary" onClick={handleSearchByDate}>Search by Date</button>
            <input className="field" type="email" placeholder="intern@office.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSearchByEmail}>Search by Email</button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Email</th>
                  <th>Seat</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Status</th>
                  <th>Checked In</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>{booking.userId?.name || '-'}</td>
                    <td>{booking.userId?.email || '-'}</td>
                    <td>{booking.seatId?.seatNumber || '-'}</td>
                    <td>{booking.date}</td>
                    <td>{booking.timeSlot || '-'}</td>
                    <td><span className={`status-pill ${booking.status}`}>{booking.status}</span></td>
                    <td>{booking.checkedInAt ? new Date(booking.checkedInAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <h3 className="section-title">QR Check-in</h3>
          <form className="form-row" onSubmit={handleQrCheckIn}>
            <input
              className="field"
              placeholder="Paste QR token value"
              value={qrTokenInput}
              onChange={(e) => setQrTokenInput(e.target.value)}
              required
            />
            <button type="submit" className="btn btn-primary">Check In</button>
          </form>
        </section>

        <section className="admin-section">
          <h3 className="section-title">Manual Seat Assignment</h3>
          <form className="form-row" onSubmit={handleAssignSeat}>
            <input className="field" type="email" placeholder="intern@office.com" value={assignForm.email} onChange={(e) => setAssignForm({ ...assignForm, email: e.target.value })} required />
            <select className="select" value={assignForm.seatId} onChange={(e) => setAssignForm({ ...assignForm, seatId: e.target.value })} required>
              <option value="">Select seat</option>
              {seats.filter((s) => s.status === 'available').map((seat) => (
                <option key={seat._id} value={seat._id}>{seat.seatNumber} - {seat.location}</option>
              ))}
            </select>
            <input className="field" type="date" value={assignForm.date} onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })} required />
            <select className="select" value={assignForm.timeSlot} onChange={(e) => setAssignForm({ ...assignForm, timeSlot: e.target.value })} required>
              {TIME_SLOT_OPTIONS.map((slot) => (<option key={slot} value={slot}>{slot}</option>))}
            </select>
            <button type="submit" className="btn btn-success">Assign Seat</button>
          </form>
        </section>

        <section className="admin-section">
          <h3 className="section-title">Reports</h3>
          <div className="form-row">
            <button className="btn btn-primary" onClick={generateReport}>Generate Report</button>
            <button className="btn btn-secondary" onClick={downloadReport} disabled={!report}>Download PDF</button>
          </div>

          {report && (
            <ul className="report-list">
              <li>Total seats: {report.totalSeats}</li>
              <li>Available seats: {report.availableSeats}</li>
              <li>Total bookings: {report.totalBookings}</li>
              <li>Most booked seat: {report.mostBooked}</li>
            </ul>
          )}

          {chartData && (
            <div className="report-chart">
              <Bar data={chartData} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
