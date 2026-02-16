const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const authRoutes = require("./routes/authRoutes");
const seatRoutes = require('./routes/seatRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const { startReminderService } = require('./services/reminderService');


app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    startReminderService();
  })
  .catch((err) => console.error(err));

app.get("/", (req, res) => res.send("API is working!"));
app.use("/api/auth", authRoutes);
app.use('/api/seats', seatRoutes);
app.use('/api/bookings', bookingRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
