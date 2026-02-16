const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const isOfficeEmail = (email) => {
  const domain = process.env.OFFICE_EMAIL_DOMAIN;
  if (!domain) return true;
  return email.toLowerCase().endsWith(`@${domain.toLowerCase()}`);
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, adminKey, phone } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isOfficeEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Use a valid office email address' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    let userRole = 'intern';

    if (role === 'admin') {
      if (!process.env.ADMIN_REGISTER_KEY || adminKey !== process.env.ADMIN_REGISTER_KEY) {
        return res.status(403).json({ message: 'Invalid admin registration key' });
      }
      userRole = 'admin';
    }

    const newUser = new User({ name, email: normalizedEmail, phone, password: hashedPassword, role: userRole });
    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { email, name } = req.body;
    const normalizedEmail = email?.toLowerCase().trim();

    if (!normalizedEmail || !name) {
      return res.status(400).json({ message: 'Email and name are required' });
    }

    if (!isOfficeEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Use a valid office email address' });
    }

    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = new User({ name, email: normalizedEmail, password: '', role: 'intern' });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(500).json({ message: 'Google login error', error: err.message });
  }
};

