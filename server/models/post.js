const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
  user: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Post", PostSchema);
