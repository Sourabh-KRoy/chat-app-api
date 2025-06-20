const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  age: Number,
  username: { type: String, unique: true },
  password: String,
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
