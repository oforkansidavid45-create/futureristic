require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const Post = require("./models/Post");

const app = express();
const server = http.createServer(app);

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// USERS MAP
// =========================
let users = {}; // username -> socket.id

// =========================
// HELPERS
// =========================
function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}

// =========================
// SOCKET CONNECTION
// =========================
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  // =========================
  // REGISTER USER (CLEAN FIX)
  // =========================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // remove old socket entry if exists
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    // prevent duplicate usernames
    if (users[username] && users[username] !== socket.id) {
      delete users[username];
    }

    socket.username = username;
    users[username] = socket.id;

    console.log("👤 Registered:", username);

    emitOnlineUsers();
  });

  // =========================
  // PRIVATE MESSAGE
  // =========================
  socket.on("privateMessage", ({ to, from, message }) => {
    if (!to || !from || !message) return;

    const receiverSocketId = users[to];

    console.log(`💬 ${from} → ${to}: ${message}`);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("privateMessage", {
        from,
        to,
        message
      });
    }
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);

    if (socket.username && users[socket.username]) {
      delete users[socket.username];
      emitOnlineUsers();
    }
  });
});

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// FRONTEND
// =========================
app.use(express.static(path.join(__dirname, "../client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// =========================
// POSTS API
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
    console.log("❌ POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);

  } catch (err) {
    console.log("❌ GET POSTS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// LIKE
// =========================
app.put("/api/posts/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likes = (post.likes || 0) + 1;
    await post.save();

    res.json(post);

  } catch (err) {
    console.log("❌ LIKE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// COMMENT
// =========================
app.post("/api/posts/comment/:id", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text) {
      return res.status(400).json({ error: "Missing data" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({ user, text });
    await post.save();

    res.json(post);

  } catch (err) {
    console.log("❌ COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// DATABASE
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB Connected"))
  .catch(err => console.log("❌ Mongo Error:", err));

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});