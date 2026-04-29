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

// Serve frontend
app.use(express.static(path.join(__dirname, "../client")));

// =========================
// ROUTES
// =========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// CREATE POST
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: "Missing user or text" });
    }

    const post = await Post.create({ user, text });

    res.json(post);

  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
});

// GET POSTS
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);

  } catch (err) {
    console.log(err);
    res.status(500).json(err.message);
  }
});

// =========================
// DATABASE
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});