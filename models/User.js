const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  avatar: {
    type: String, // profile picture (future)
    default: ""
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("User", UserSchema);