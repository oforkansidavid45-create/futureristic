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

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));

let users = {};

// ================= ONLINE USERS FIX =================
function emitOnlineUsers() {
  const safeUsers = Object.keys(users).filter(Boolean);
  io.emit("onlineUsers", safeUsers);
}

// ================= MESSAGES =================
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

  emitOnlineUsers();

  // ================= REGISTER FIX =================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // remove old socket
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    socket.username = username;
    users[username] = socket.id;

    emitOnlineUsers();
  });

  // ================= PRIVATE MESSAGE FIX =================
  socket.on("privateMessage", async (data) => {
    try {
      if (!data?.from || !data?.to || !data?.message) return;

      let from = data.from.trim();
      let to = data.to.trim();
      let message = data.message.trim();

      if (!message) return;

      // SAVE
      await Message.create({
        from: from.split("_")[0],
        to: to.split("_")[0],
        message
      });

      const receiverSocketId = users[to];

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("privateMessage", {
          from,
          to,
          message,
          audio: data.audio || null
        });

        const senderSocket = users[from];
        if (senderSocket) {
          io.to(senderSocket).emit("delivered", { from: to });
        }
      }

    } catch (err) {
      console.log("❌ MESSAGE ERROR:", err);
    }
  });

  // ================= TYPING =================
  socket.on("typing", ({ from, to }) => {
    const id = users[to];
    if (id) io.to(id).emit("typing", { from });
  });

  socket.on("stopTyping", ({ from, to }) => {
    const id = users[to];
    if (id) io.to(id).emit("stopTyping", { from });
  });

  // ================= SEEN =================
  socket.on("seen", ({ from, to }) => {
    const id = users[from];
    if (id) io.to(id).emit("seen", { from: to });
  });

  // ================= DISCONNECT FIX =================
  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      emitOnlineUsers();
    }
  });
});

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB connected"))
  .catch(err => console.log("❌ Mongo error:", err));

// ================= START =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log("🚀 Server running on", PORT));