// ================= HELPERS =================
function cleanName(name) {
  if (!name) return "";
  return name.trim().toLowerCase();
}
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");

// ================= MODELS =================
const Post = require("./models/Post");
const Message = require("./models/Message");
const User = require("./models/Users");

// ================= APP INIT =================
const app = express();
const server = http.createServer(app);

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= USERS STORE =================
let users = {};

// ================= HELPERS =================
function emitOnlineUsers() {
  io.emit("onlineUsers", Object.keys(users));
}
app.get("/test", (req, res) => {
  res.send("Backend working");
});
// ================= AUTH SIGNUP =================
app.post("/api/auth/signup", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

    username = username.trim().toLowerCase();

    const exists = await User.findOne({ username });

    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashed
    });

    console.log("USER CREATED:", user);

    res.json({ message: "User created", user: user.username });

  } catch (err) {
    console.log("❌ SIGNUP ERROR FULL:", err);
    res.status(500).json({ error: err.message });
  }
});
// ================= AUTH LOGIN =================
app.post("/api/auth/login", async (req, res) => {

  try {

    let { username, password } = req.body;

    console.log("LOGIN REQUEST:", req.body);

    // ================= VALIDATION =================
    if (!username || !password) {
      return res.status(400).json({
        error: "Fill all fields"
      });
    }

    username = username.trim().toLowerCase();

    // ================= FIND USER =================
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    // ================= CHECK PASSWORD =================
    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        error: "Wrong password"
      });
    }

    // ================= SUCCESS =================
    res.json({
      message: "Login successful",
      user: username
    });

  } catch (err) {

    console.log("❌ LOGIN ERROR:", err);

    res.status(500).json({
      error: "Server error"
    });

  }

});


// ================= PROFILE PIC =================

const storage = multer.memoryStorage();
const upload = multer({ storage });
app.post("/api/upload-profile", upload.single("image"), async (req, res) => {

  try {

    const username = req.body.username;

    if (!req.file) {
      return res.status(400).json({
        error: "No image"
      });
    }

    const result = await cloudinary.uploader.upload_stream(
      {
        folder: "futurebook_profiles"
      },

      async (error, uploaded) => {

        if (error) {
          console.log(error);
          return res.status(500).json({
            error: "Upload failed"
          });
        }

        const user = await User.findOneAndUpdate(
          { username },
          {
            profilePic: uploaded.secure_url
          },
          { new: true }
        );

        res.json({
          profilePic: user.profilePic
        });

      }

    );

    result.end(req.file.buffer);

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

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


// ================= SOCKET EVENTS =================
io.on("connection", (socket) => {

  console.log("⚡ connected:", socket.id);

  emitOnlineUsers();

  // ================= REGISTER USER =================

socket.on("register", (username) => {
  if (!username) return;

  const clean = username.trim().toLowerCase();

  socket.username = clean;

  if (!users[clean]) {
    users[clean] = [];
  }

  if (!users[clean].includes(socket.id)) {
    users[clean].push(socket.id);
  }

  console.log("👤 REGISTERED USERS:", users);
  console.log("🔥 REGISTER EVENT:", username);
console.log("🔥 SOCKET ID:", socket.id);
console.log("🔥 USERS OBJECT:", users);
  

  emitOnlineUsers();
});

  // ================= PRIVATE MESSAGE =================

socket.on("privateMessage", async (data) => {
  try {
    if (!data) return;

    const from = cleanName(data.from);
    const to = cleanName(data.to);

    const message = (data.message || "").trim();
    const audio = data.audio || null;
    const image = data.image || null;
    const file = data.file || null;

    if (!from || !to || (!message && !audio && !image && !file)) return;

    const newMessage = new Message({
      from,
      to,
      message,
      audio,
      image,
      file
    });

    await newMessage.save();

    const payload = { from, to, message, audio, image, file };

    // SEND TO RECEIVER
   // SEND TO RECEIVER
if (users[to] && users[to].length > 0) {

  users[to].forEach(socketId => {

    console.log(
      "📨 Sending to receiver:",
      to,
      socketId
    );

    io.to(socketId).emit(
      "privateMessage",
      payload
    );

  });

} else {

  console.log("❌ RECEIVER NOT ONLINE:", to);

}

// SEND BACK TO SENDER
if (users[from] && users[from].length > 0) {

  users[from].forEach(socketId => {

    console.log(
      "📨 Sending back to sender:",
      from,
      socketId
    );

    io.to(socketId).emit(
      "privateMessage",
      payload
    );

  });

}

  } catch (err) {
    console.log("❌ MESSAGE ERROR:", err);
  }
});

  // ================= SEEN =================

  socket.on("seen", ({ from, to }) => {

    if (!from || !to) return;

    const sender =
      from.trim().toLowerCase();

    if (users[sender]) {

      users[sender].forEach(id => {

        io.to(id).emit(
          "messageSeen",
          {
            from: to,
            status: "seen"
          }
        );

      });

    }

  });

  // ================= TYPING =================

  socket.on("typing", ({ from, to }) => {

    if (users[to]) {

      users[to].forEach(id => {

        io.to(id).emit(
          "typing",
          { from }
        );

      });

    }

  });

  // ================= STOP TYPING =================

  socket.on("stopTyping", ({ from, to }) => {

    if (users[to]) {

      users[to].forEach(id => {

        io.to(id).emit(
          "stopTyping",
          { from }
        );

      });

    }

  });

  // ================= DISCONNECT =================

  socket.on("disconnect", () => {

    if (!socket.username) return;

    const user = socket.username;

    if (users[user]) {

      users[user] =
        users[user].filter(
          id => id !== socket.id
        );

      // REMOVE USER IF EMPTY
      if (users[user].length === 0) {

        delete users[user];

      }

    }

    console.log(
      "❌ DISCONNECTED:",
      socket.id
    );

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

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});