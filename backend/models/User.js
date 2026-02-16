const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: false },
  password: { type: String, required: false },
  role: { type: String, enum: ["admin", "intern"], default: "intern" }
});

module.exports = mongoose.model("User", userSchema);
