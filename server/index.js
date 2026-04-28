require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const Message = require("./models/message");

const app = express();
const server = http.createServer(app);

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());
app.use(express.static("client"));

// =========================
// HEALTH CHECK (RENDER SAFE)
// =========================
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Chat server running 🚀"
  });
});

// =========================
// DB CONNECTION
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: { origin: "*" }
});

// =========================
// ONLINE USERS
// =========================
let onlineUsers = {};

// =========================
// ROOM HELPER
// =========================
function getRoomId(a, b) {
  return [a, b].sort().join("-");
}

// =========================
// SOCKET LOGIC
// =========================
io.on("connection", (socket) => {

  console.log("Connected:", socket.id);

  // JOIN USER
  socket.on("join", (username) => {
    if (!username) return;

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("updateOnlineUsers", Object.values(onlineUsers));
  });

  // JOIN ROOM
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  // LOAD MESSAGES
  socket.on("loadRoomMessages", async (roomId) => {
    try {
      const messages = await Message.find({ roomId })
        .sort({ createdAt: 1 })
        .lean();

      socket.emit("roomMessages", messages);
    } catch (err) {
      console.log("Load error:", err);
    }
  });

  // SEND MESSAGE
  socket.on("sendPrivateMessage", async ({ from, to, text }) => {
    try {
      if (!from || !to || !text) return;

      const roomId = getRoomId(from, to);

      const message = await Message.create({
        user: from,
        text,
        roomId,
        status: "sent"
      });

      io.to(roomId).emit("receivePrivateMessage", {
        user: from,
        text,
        roomId,
        status: "delivered",
        createdAt: message.createdAt
      });

    } catch (err) {
      console.log("Send error:", err);
    }
  });

  // TYPING
  socket.on("typing", (name) => {
    socket.broadcast.emit("showTyping", name);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("hideTyping");
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("updateOnlineUsers", Object.values(onlineUsers));
  });

});

// =========================
// START SERVER (RENDER SAFE)
// =========================
const PORT = process.env.PORT;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});