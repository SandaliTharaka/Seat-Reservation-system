# Seat Reservation System

[![MERN](https://img.shields.io/badge/Stack-MERN-0ea5e9)](#tech-stack)
[![React](https://img.shields.io/badge/Frontend-React-61dafb)](#tech-stack)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-3c873a)](#tech-stack)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-4ea94b)](#tech-stack)

A role-based seat booking platform for interns and admins with QR check-in, reports, and calendar-ready reservations.

## Screenshots

### Login
![Login](docs/screenshots/01-login.png)

### Intern - Book Seat
![Intern Book Seat](docs/screenshots/02-intern-book-seat.png)

### Admin - Manage Seats
![Admin Manage Seats](docs/screenshots/03-admin-manage-seats.png)

### Admin - Reports
![Admin Reports](docs/screenshots/05-admin-reports.png)

### Intern - My Reservations
![My Reservations](docs/screenshots/06-my-reservations.png)

### Google Login
![Google Login](docs/screenshots/07-google-login.png)

## Features

- Intern & Admin authentication (JWT + optional Google login)
- Seat booking by date and time slot
- Validation rules (no double booking, one seat/day, future-only updates)
- Admin seat management (add/edit/delete + seed default seats)
- Admin reservation search and manual assignment
- QR token generation and admin check-in flow
- Reports (chart + PDF export)
- Calendar links (Google/Outlook) + ICS file export
- Reminder service (email; optional SMS via Twilio)

## Tech Stack

- Frontend: React, React Router, Axios, Chart.js, jsPDF
- Backend: Node.js, Express, MongoDB, Mongoose, JWT
- Auth/Utils: bcryptjs, Firebase Auth, Nodemailer

## Quick Start

### 1) Backend

```bash
cd backend
npm install
npm start
```

### 2) Frontend

```bash
cd frontend
npm install
npm start
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Environment (`backend/.env`)

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/seat_reservation_db
JWT_SECRET=your_jwt_secret

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

OFFICE_EMAIL_DOMAIN=
ADMIN_REGISTER_KEY=change-this-admin-key

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

## Admin Bootstrap (optional)

```powershell
$body = @{
  name = "Admin User"
  email = "admin@example.com"
  password = "Admin@12345"
  role = "admin"
  adminKey = "change-this-admin-key"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/auth/register" -ContentType "application/json" -Body $body
```

## Project Structure

```text
seat-reservation-system/
  backend/
  frontend/
```

## License

For academic/internship use. Add a formal license (e.g., MIT) if needed.
