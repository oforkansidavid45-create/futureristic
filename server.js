  require("dotenv").config();

  const express = require("express");
  const http = require("http");
  const cors = require("cors");
  const path = require("path");
  const mongoose = require("mongoose");
  const { Server } = require("socket.io");

  const Post = require("./models/Post");
  const Message = require("./models/Message");

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

  // ================= LOAD MESSAGES =================
  app.get("/api/messages/:user1/:user2", async (req, res) => {
    try {
      const user1 = (req.params.user1 || "").trim();
      const user2 = (req.params.user2 || "").trim();

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

  // ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  emitOnlineUsers();

  // ================= REGISTER =================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim().toLowerCase();
    socket.username = username;

    if (!users[username]) {
      users[username] = [];
    }

    if (!users[username].includes(socket.id)) {
      users[username].push(socket.id);
    }

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE =================
socket.on("privateMessage", (data) => {
  if (!data) return;

  const fromClean = cleanName(data.from);

  // ALWAYS show message
  if (data.audio) {
    addVoiceMessage(fromClean, data.audio);
  } else {
    addMessage(fromClean, data.message);
  }

  // mark delivered
  socket.emit("delivered", {
    from: data.from,
    to: username
  });
});
socket.on("typing", ({ from, to }) => {
  if (!from || !to) return;

  if (users[to]) {
    users[to].forEach(socketId => {
      io.to(socketId).emit("typing", { from });
    });
  }
});
  // ================= STOP TYPING =================
  socket.on("stopTyping", ({ from, to }) => {
    if (!from || !to) return;

    if (users[to]) {
      users[to].forEach(socketId => {
        io.to(socketId).emit("stopTyping", { from });
      });
    }
  });

  // ================= DELIVERED =================
  socket.on("delivered", ({ from, to }) => {
    if (users[from]) {
      users[from].forEach(socketId => {
        io.to(socketId).emit("delivered", { from: to });
      });
    }
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    if (users[from]) {
      users[from].forEach(socketId => {
        io.to(socketId).emit("delivered", { from: to });
      });
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    if (!socket.username) return;

    const user = socket.username;

    if (users[user]) {
      users[user] = users[user].filter(id => id !== socket.id);

      if (users[user].length === 0) {
        delete users[user];
      }
    }

    emitOnlineUsers();
  });

}); // ✅ CLOSE HERE ONLY (VERY IMPORTANT)

  // ================= POSTS =================
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

  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: -1 });
      res.json(posts);
    } catch (err) {
      console.log("❌ GET ERROR:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

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