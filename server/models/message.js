const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true,
    trim: true
  },

  text: {
    type: String,
    required: true,
    trim: true
  },

  // 🔥 private chat room
  roomId: {
    type: String,
    required: true,
    index: true
  },

  // 🔥 message status
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 🔥 IMPORTANT: improves fast sorting in chat history
MessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);