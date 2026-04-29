const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false } // keeps comments lighter (no extra IDs needed)
);

const PostSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },

    likes: {
      type: Number,
      default: 0
    },

    comments: {
      type: [CommentSchema],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);