require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// =========================
// SOCKET.IO SETUP
// =========================
const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// 🧠 ONLINE USERS (SAFE MAP)
// =========================
let users = {}; // username -> socket.id

// =========================
// HELPER: BROADCAST USERS
// =========================
const emitOnlineUsers = () => {
  io.emit("onlineUsers", Object.keys(users));
};

// =========================
// SOCKET CONNECTION
// =========================
io.on("connection", (socket) => {
  console.log("⚡ Connected:", socket.id);

  // =========================
  // REGISTER USER (FIXED SAFE)
  // =========================
  socket.on("register", (username) => {
    if (!username) return;

    username = username.trim();

    // remove old socket if user reconnects
    for (let key in users) {
      if (users[key] === socket.id) {
        delete users[key];
      }
    }

    socket.username = username;
    users[username] = socket.id;

    console.log("👤 Registered:", username);

    emitOnlineUsers();
  });

  // =========================
  // PRIVATE MESSAGE (SAFE + FIXED)
  // =========================
  socket.on("privateMessage", ({ from, to, message }) => {
    if (!from || !to || !message) return;

    const receiverSocketId = users[to];

    console.log(`💬 ${from} → ${to}: ${message}`);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("privateMessage", {
        from,
        to,
        message
      });
    }
  });

  // =========================
  // DISCONNECT CLEANUP (FIXED)
  // =========================
  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);

    if (socket.username) {
      delete users[socket.username];
      emitOnlineUsers();
    }
  });
});

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// FRONTEND SERVE
// =========================
app.use(express.static(path.join(__dirname, "client")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client/index.html"));
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});