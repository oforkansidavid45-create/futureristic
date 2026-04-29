const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    user: String,
    text: String,
    likes: {
      type: Number,
      default: 0
    },
    comments: [
      {
        user: String,
        text: String,
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);