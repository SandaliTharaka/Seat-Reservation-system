const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html, attachments = []) => {
  await transporter.sendMail({
    from: `"Seat Reservation System" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    attachments
  });
};

module.exports = sendEmail;
