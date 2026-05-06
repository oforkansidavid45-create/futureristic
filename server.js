  require("dotenv").config();

  const express = require("express");
  const http = require("http");
  const cors = require("cors");
  const path = require("path");
  const mongoose = require("mongoose");
  const { Server } = require("socket.io");

  const Post = require("./models/Post");
  const Message = require("./models/Message");
const User = require("./models/Users");
  const app = express();
  const server = http.createServer(app);

  app.post("/api/auth/signup", async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

    username = username.trim().toLowerCase();

    // check if user exists
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    // hash password
    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashed
    });

    res.json({ message: "Account created", user: username });

  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
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

    console.log("👤 REGISTERED USERS:", users);

    emitOnlineUsers();
  });

  app.post("/api/auth/login", async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

    username = username.trim().toLowerCase();

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ error: "Wrong password" });
    }

    res.json({ message: "Login successful", user: username });

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
  // ================= PRIVATE MESSAGE (CLEAN + FIXED) =================
  socket.on("privateMessage", (data) => {
    try {
      console.log("🔥 SERVER GOT MESSAGE:", data);

      const from = data.from?.trim().toLowerCase();
      const to = data.to?.trim().toLowerCase();
      const message = (data.message || "").trim();

      if (!from || !to || !message) return;

      const payload = {
        from,
        to,
        message,
        status: "sent",
        time: Date.now()
      };

      // SEND TO RECEIVER
      if (users[to]) {
        users[to].forEach(id => {
          io.to(id).emit("privateMessage", {
            ...payload,
            status: "delivered"
          });
        });
      }

      // SEND BACK TO SENDER (tick update)
      if (users[from]) {
        users[from].forEach(id => {
          io.to(id).emit("messageStatus", {
            to,
            status: "delivered"
          });
        });
      }

    } catch (err) {
      console.log("❌ MESSAGE ERROR:", err);
    }
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    if (!from || !to) return;

    const sender = from.trim().toLowerCase();

    if (users[sender]) {
      users[sender].forEach(id => {
        io.to(id).emit("messageSeen", {
          from: to,
          status: "seen"
        });
      });
    }
  });

  // ================= TYPING =================
  socket.on("typing", ({ from, to }) => {
    if (users[to]) {
      users[to].forEach(id => {
        io.to(id).emit("typing", { from });
      });
    }
  });

  socket.on("stopTyping", ({ from, to }) => {
    if (users[to]) {
      users[to].forEach(id => {
        io.to(id).emit("stopTyping", { from });
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
app.post("/api/signup", async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

    const exists = await User.findOne({ name: name.toLowerCase() });
    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const user = await User.create({
      name: name.toLowerCase(),
      password
    });

    res.json({ success: true, user: user.name });

  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}); 
app.post("/api/login", async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await User.findOne({ name: name.toLowerCase() });

    if (!user || user.password !== password) {
      return res.status(400).json({ error: "Invalid login" });
    }

    res.json({ success: true, user: user.name });

  } catch (err) {
    console.log("❌ LOGIN ERROR:", err);
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