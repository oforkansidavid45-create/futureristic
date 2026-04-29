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

    console.log("📩 Incoming post:", user, text);

    if (!user || !text) {
      return res.status(400).json({ error: "Missing user or text" });
    }

    const post = await Post.create({
      user,
      text
    });

    console.log("✅ Saved post:", post);

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

    console.log("📤 Sending posts:", posts.length);

    res.json(posts);

  } catch (err) {
    console.log("❌ ERROR fetching posts:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// DATABASE CONNECTION
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