const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    to: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    // 🔥 optional but useful (NOT required)
    roomId: {
      type: String,
      index: true
    },

    message: {
      type: String,
      default: ""
    },

    audio: {
      type: String,
      default: null
    },

    image: {
      type: String,
      default: null
    },

    file: {
      type: Object,
      default: null
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },

    seenAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// INDEXES
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });
MessageSchema.index({ roomId: 1 });

module.exports = mongoose.model("Message", MessageSchema);