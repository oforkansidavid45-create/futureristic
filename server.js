require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Post = require("./models/Post");
const Message = require("./models/Message"); // ✅ keep this

const app = express();
const server = http.createServer(app);

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));


// ================= LOAD MESSAGES =================
app.get("/api/messages/:user1/:user2", async (req, res) => {
  try {
    const user1 = req.params.user1.trim();
    const user2 = req.params.user2.trim();

    const messages = await Message.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.log("❌ MESSAGE LOAD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// ================= USERS =================
let users = {};

// ================= HELPERS =================
function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  emitOnlineUsers();

  // ================= REGISTER =================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // remove old socket if user reconnects
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    // remove duplicate usernames (IMPORTANT FIX)
    for (let key in users) {
      if (key.split("_")[0] === username.split("_")[0]) {
        delete users[key];
      }
    }

    socket.username = username;
    users[username] = socket.id;

    console.log("ONLINE USERS:", Object.keys(users));

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE =================
socket.on("privateMessage", async ({ from, to, message }) => {
  // 💾 SAVE MESSAGE
await Message.create({
  from: from.split("_")[0],
  to: to.split("_")[0],
  message
});
    if (!from || !to || !message) return;

    message = message.trim();
    if (!message) return;

    // ✅ FIXED: correct lookup
    const receiverSocketId = users[to];

    console.log(`💬 ${from} → ${to}: ${message}`);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("privateMessage", {
        from,
        to,
        message
      });

      const senderSocket = users[from];
      if (senderSocket) {
        io.to(senderSocket).emit("delivered", { from: to });
      }

    } else {
      console.log("⚠️ User not online:", to);
    }
  });

  // ================= TYPING =================
  socket.on("typing", ({ from, to }) => {
    if (!from || !to) return;

    const receiverSocketId = users[to];
    if (!receiverSocketId) return;

    io.to(receiverSocketId).emit("typing", { from });
  });

  socket.on("stopTyping", ({ from, to }) => {
    if (!from || !to) return;

    const receiverSocketId = users[to];
    if (!receiverSocketId) return;

    io.to(receiverSocketId).emit("stopTyping", { from });
  });

  // ================= DELIVERED =================
  socket.on("delivered", ({ from, to }) => {
    if (!from || !to) return;

    const senderSocket = users[from];
    if (senderSocket) {
      io.to(senderSocket).emit("delivered", { from: to });
    }
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    if (!from || !to) return;

    const senderSocket = users[from];
    if (senderSocket) {
      io.to(senderSocket).emit("seen", { from: to });
    }
  });

  // ================= KEEP ALIVE =================
  socket.on("pingCheck", () => {
    socket.emit("pongCheck");
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