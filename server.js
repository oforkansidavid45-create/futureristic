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

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

let users = {};

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();
    socket.username = username;
    users[username] = socket.id;

    io.emit("onlineUsers", Object.keys(users));
  });

  socket.on("privateMessage", ({ from, to, message }) => {
    if (!from || !to || !message) return;

    const receiver = users[to];

    if (receiver) {
      io.to(receiver).emit("privateMessage", {
        from,
        to,
        message
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      io.emit("onlineUsers", Object.keys(users));
    }
  });
});

// ================= POSTS =================
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    const post = await Post.create({ user, text, likes: 0, comments: [] });

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
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// ================= START =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on", PORT);
});