import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!token) return null;

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        Seat Reservation
        <span>{role === 'admin' ? 'Admin Console' : 'Intern Portal'}</span>
      </div>

      <button type="button" className="navbar-toggle" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
        Menu
      </button>

      <div className={`navbar-links ${isOpen ? 'show' : ''}`}>
        {role === 'admin' ? (
          <NavLink to="/admin" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
        ) : (
          <>
            <NavLink to="/home" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>Book Seat</NavLink>
            <NavLink to="/bookings" className={({ isActive }) => `navbar-link${isActive ? ' active' : ''}`}>My Reservations</NavLink>
          </>
        )}
        <button onClick={handleLogout} className="navbar-logout">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
