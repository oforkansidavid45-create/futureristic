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

// ✅ FIX: only ONE static folder line
app.use(express.static(path.join(__dirname, "client")));

// ================= USERS =================
let users = {};

function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("⚡ connected:", socket.id);

  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    socket.username = username;
    users[username] = socket.id;

    emitOnlineUsers();
  });

  socket.on("privateMessage", ({ from, to, message }) => {
    if (!from || !to || !message) return;

    const receiverSocketId = users[to];

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("privateMessage", {
        from,
        to,
        message
      });
    }
  });

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

    if (!user || !text) {
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
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/posts", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB connected"))
  .catch(err => console.log(err));

// ================= START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("🚀 Server running on", PORT));