require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Post = require("./models/Post");

const app = express();
const server = http.createServer(app);

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

// ================= USERS =================
let users = {};

// ================= HELPERS =================
function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  // 🔥 FIX: send users immediately on connect
  emitOnlineUsers();

  // ================= REGISTER =================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // 🔥 FIX: prevent duplicate usernames
    if (users[username]) delete users[username];

    // remove old socket mapping if exists
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    socket.username = username;
    users[username] = socket.id;

    console.log("👤 ONLINE USERS:", Object.keys(users));

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE =================
  socket.on("privateMessage", ({ from, to, message }) => {
    if (!from || !to || !message) return;

    message = message.trim();
    if (!message) return;

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

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    console.log("❌ disconnected:", socket.id);

    if (socket.username) {
      delete users[socket.username];
      emitOnlineUsers();
    }
  });
});

// ================= POSTS =================

// CREATE POST
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing data" });
    }

    const post = await Post.create({
      user: user.trim(),
      text: text.trim(),
      likes: 0,
      comments: []
    });

    res.json(post);
  } catch (err) {
    console.log("❌ POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET POSTS
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.log("❌ GET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ❤️ LIKE POST
app.put("/api/posts/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    post.likes += 1;
    await post.save();

    res.json(post);
  } catch (err) {
    console.log("❌ LIKE ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// 💬 COMMENT POST
app.post("/api/posts/comment/:id", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing comment" });
    }

    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({
      user: user.trim(),
      text: text.trim()
    });

    await post.save();

    res.json(post);
  } catch (err) {
    console.log("❌ COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// ================= START =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});