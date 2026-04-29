require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const Post = require("./models/Post");

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// SERVE FRONTEND
// =========================
app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// =========================
// CREATE POST
// =========================
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: "Missing user or text" });
    }

    const post = await Post.create({
      user,
      text,
      likes: 0,
      comments: []
    });

    res.json(post);

  } catch (err) {
    console.log("❌ ERROR saving post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// GET POSTS
// =========================
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);

  } catch (err) {
    console.log("❌ ERROR fetching posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// ❤️ LIKE POST (IMPROVED)
// =========================
app.put("/api/posts/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    post.likes = post.likes + 1;

    await post.save();

    res.json(post);

  } catch (err) {
    console.log("❌ ERROR liking post:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// 💬 ADD COMMENT (IMPROVED)
// =========================
app.post("/api/posts/comment/:id", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: "Missing user or text" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    post.comments.push({ user, text });

    await post.save();

    res.json(post);

  } catch (err) {
    console.log("❌ Comment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// DATABASE
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});