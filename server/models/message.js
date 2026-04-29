const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true
  },

  to: {
    type: String,
    required: true
  },

  roomId: {
    type: String,
    required: true,
    index: true
  },

  text: {
    type: String,
    required: true,
    trim: true
  },

  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent"
  }

}, {
  timestamps: true
});

// 🔥 fast chat history loading
MessageSchema.index({ roomId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", MessageSchema);