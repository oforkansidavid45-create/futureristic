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

    username = username.trim();

    socket.username = username;
  // ❌ REMOVE duplicate same-name users
for (let key in users) {
  if (key.split("_")[0] === username.split("_")[0]) {
    delete users[key];
  }
}

// remove old tabs of same user
for (let key in users) {
  if (key.split("_")[0] === username.split("_")[0]) {
    delete users[key];
  }
}

users[username] = socket.id;

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE =================
socket.on("privateMessage", async (data) => {
  try {
    if (!data || !data.from || !data.to) return;

    const from = data.from.trim();
    const to = data.to.trim();

    const message = (data.message || "").trim();
    const audio = data.audio || null;

    if (!message && !audio) return;

    // ================= SAVE MESSAGE =================
    await Message.create({
      from: from.split("_")[0],
      to: to.split("_")[0],
      message,
      audio
    });

    // ================= NORMALIZE MESSAGE =================
    const payload = {
      from,
      to,
      message,
      audio
    };

    // ================= SEND TO RECEIVER (ALL TABS) =================
    for (let key in users) {
      if (key.split("_")[0] === to.split("_")[0]) {
        io.to(users[key]).emit("privateMessage", payload);
      }
    }

    // ================= SEND BACK TO SENDER (ALL TABS) =================
    for (let key in users) {
      if (key.split("_")[0] === from.split("_")[0]) {
        io.to(users[key]).emit("delivered", {
          from: to
        });
      }
    }

  } catch (err) {
    console.log("❌ PRIVATE MESSAGE ERROR:", err);
  }
});
  // ================= STOP TYPING =================
  socket.on("stopTyping", ({ from, to }) => {
    if (!from || !to) return;

    let receiverSocketId = null;

    for (let key in users) {
      if (key.split("_")[0] === to.split("_")[0]) {
        receiverSocketId = users[key];
        break;
      }
    }

    if (!receiverSocketId) return;

    io.to(receiverSocketId).emit("stopTyping", { from });
  });

  // ================= DELIVERED =================
  socket.on("delivered", ({ from, to }) => {
    const senderSocket = users[from];
    if (senderSocket) {
      io.to(senderSocket).emit("delivered", { from: to });
    }
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    // 🔥 FIND SENDER (WORKS WITH TAB_ID)
let senderSocket = null;

for (let key in users) {
  if (key.split("_")[0] === from.split("_")[0]) {
    senderSocket = users[key];
    break;
  }
}

if (senderSocket) {
  io.to(senderSocket).emit("delivered", { from: to });
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