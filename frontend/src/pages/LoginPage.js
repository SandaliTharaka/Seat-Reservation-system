import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/api';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../firebase';
import './AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await API.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const res = await API.post('/auth/google-login', { email: user.email, name: user.displayName });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Google login failed');
    }
  };

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <h1>Seat Reservation System</h1>
        <p>Enterprise-ready platform for intern seating operations with secure reservations, seat governance, and utilization tracking.</p>
        <ul>
          <li>Role-based secure access</li>
          <li>Real-time seat availability</li>
          <li>Admin reporting and check-in controls</li>
        </ul>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>Sign In</h2>
          <p className="auth-subtitle">Welcome back. Access your reservation workspace.</p>
          {error && <p className="feedback error">{error}</p>}

          <form className="auth-form" onSubmit={handleLogin}>
            <input
              className="field"
              type="email"
              placeholder="Office email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <div className="input-wrap">
              <input
                className="field"
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" className="input-icon-btn" onClick={() => setShowPass(!showPass)}>
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
            <button type="submit" className="btn btn-primary">Login</button>
          </form>

          <button onClick={handleGoogleLogin} className="btn google-btn">Continue with Google</button>

          <p className="auth-row" style={{ marginTop: 14 }}>
            <span>No account yet?</span>
            <Link to="/register" className="auth-link">Register</Link>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
