import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BookingsPage from './pages/BookingsPage';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';

const RequireAuth = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const currentRole = localStorage.getItem('role');

  if (!token) return <Navigate to="/" replace />;
  if (role && currentRole !== role) {
    return <Navigate to={currentRole === 'admin' ? '/admin' : '/home'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/home"
          element={
            <RequireAuth role="intern">
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/bookings"
          element={
            <RequireAuth role="intern">
              <BookingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth role="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}


export default App;
