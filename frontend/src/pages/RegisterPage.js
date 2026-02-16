import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/api';
import './AuthPages.css';

const RegisterPage = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await API.post('/auth/register', { ...form, role: 'intern' });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <h1>Create Intern Account</h1>
        <p>Register with your office email address to reserve seats, manage future reservations, and view booking history.</p>
        <ul>
          <li>One seat per day policy</li>
          <li>QR-ready reservations</li>
          <li>Calendar-ready confirmations</li>
        </ul>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>Register</h2>
          <p className="auth-subtitle">Set up your intern account to start booking seats.</p>
          {error && <p className="feedback error">{error}</p>}

          <form className="auth-form" onSubmit={handleRegister}>
            <input className="field" type="text" name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
            <input className="field" type="email" name="email" placeholder="Office email" value={form.email} onChange={handleChange} required />
            <input className="field" type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} required />
            <button type="submit" className="btn btn-primary">Create Account</button>
          </form>

          <p className="auth-row" style={{ marginTop: 14 }}>
            <span>Already registered?</span>
            <Link to="/" className="auth-link">Login</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default RegisterPage;
