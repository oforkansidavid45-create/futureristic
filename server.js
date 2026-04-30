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

// ================= SOCKET.IO =================
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

// ================= USERS =================
// username_with_tabId -> socket.id
let users = {};

// ================= HELPERS =================
function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  // ================= REGISTER =================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // remove old mapping for THIS socket
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    // store user
    socket.username = username;
    users[username] = socket.id;

    console.log("👤 registered:", username);

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
    } else {
      console.log("❌ user not online:", to);
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
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing user or text" });
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

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.log("❌ GET ERROR:", err);
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