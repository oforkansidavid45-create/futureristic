const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },

  text: {
    type: String,
    required: true,
    trim: true
  },

  likes: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Post", PostSchema);