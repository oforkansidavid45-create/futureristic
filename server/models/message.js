const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    from: {
      type: String,
      required: true,
      trim: true
    },

    to: {
      type: String,
      required: true,
      trim: true
    },

    // 🔥 FIX: must always be consistent (important for DM history)
    roomId: {
      type: String,
      required: true,
      index: true
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },

    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent"
    },

    // 🔥 read receipt support
    seenAt: {
      type: Date,
      default: null
    }

  },
  {
    timestamps: true
  }
);

// =========================
// ⚡ INDEXES (GOOD)
// =========================
MessageSchema.index({ roomId: 1, createdAt: 1 });
MessageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model("Message", MessageSchema);