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
function cleanUser(name) {
  return (name || "").split("_")[0].trim();
}

function emitOnlineUsers() {
  // show ONLY clean names (no duplicates)
  const cleanUsers = [...new Set(
    Object.keys(users).map(cleanUser)
  )];

  io.emit("onlineUsers", cleanUsers);
}

// ================= LOAD MESSAGES =================
app.get("/api/messages/:user1/:user2", async (req, res) => {
  try {
    const user1 = cleanUser(req.params.user1);
    const user2 = cleanUser(req.params.user2);

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

    const clean = cleanUser(username);

    socket.username = clean;
    users[clean] = socket.id;

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE =================
  socket.on("privateMessage", async (data) => {
    try {
      if (!data) return;

      const from = cleanUser(data.from);
      const to = cleanUser(data.to);
      const message = (data.message || "").trim();

      if (!from || !to || !message) return;

      // SAVE
      await Message.create({ from, to, message });

      const receiverSocketId = users[to];

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
      }
    } catch (err) {
      console.log("❌ PRIVATE MESSAGE ERROR:", err);
    }
  });

  // ================= TYPING =================
  socket.on("typing", ({ from, to }) => {
    const receiverSocketId = users[cleanUser(to)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", {
        from: cleanUser(from)
      });
    }
  });

  socket.on("stopTyping", ({ from, to }) => {
    const receiverSocketId = users[cleanUser(to)];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", {
        from: cleanUser(from)
      });
    }
  });

  // ================= DELIVERED =================
  socket.on("delivered", ({ from, to }) => {
    const senderSocket = users[cleanUser(from)];
    if (senderSocket) {
      io.to(senderSocket).emit("delivered", { from: cleanUser(to) });
    }
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    const senderSocket = users[cleanUser(from)];
    if (senderSocket) {
      io.to(senderSocket).emit("seen", { from: cleanUser(to) });
    }
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
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
      return res.status(400).json({ error: "Missing data" });
    }

    const post = await Post.create({
      user: cleanUser(user),
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
      user: cleanUser(user),
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