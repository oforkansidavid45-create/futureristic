const mongoose = require("mongoose");

// ================= COMMENT =================
const CommentSchema = new mongoose.Schema(
  {
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

    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

// ================= POST =================
const PostSchema = new mongoose.Schema(
  {
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

    // total likes count
    likes: {
      type: Number,
      default: 0
    },

    // who liked (important for future)
    likedBy: {
      type: [String],
      default: []
    },

    comments: {
      type: [CommentSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// ================= EXPORT =================
module.exports = mongoose.model("Post", PostSchema);