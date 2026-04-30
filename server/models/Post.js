const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const PostSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },

    likes: { type: Number, default: 0 },

    comments: { type: [CommentSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);