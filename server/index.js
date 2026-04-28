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

// 🔥 IMPORTANT: Render health route
app.get("/", (req, res) => {
  res.status(200).send("Chat server is alive 🚀");
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

  socket.on("join", (username) => {
    if (!username) return;

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("updateOnlineUsers", Object.values(onlineUsers));
  });

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  socket.on("loadRoomMessages", async (roomId) => {
    try {
      const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
      socket.emit("roomMessages", messages);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("sendPrivateMessage", async ({ from, to, text }) => {
    try {
      if (!from || !to || !text) return;

      const roomId = getRoomId(from, to);

      const message = await Message.create({
        user: from,
        text,
        roomId,
        status: "sent",
        createdAt: new Date()
      });

      io.to(roomId).emit("receivePrivateMessage", {
        user: from,
        text,
        roomId,
        status: "delivered",
        createdAt: message.createdAt
      });

    } catch (err) {
      console.log(err);
    }
  });

  socket.on("typing", (name) => {
    socket.broadcast.emit("showTyping", name);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("hideTyping");
  });

  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];
    io.emit("updateOnlineUsers", Object.values(onlineUsers));
  });

});

// =========================
// IMPORTANT FIX FOR RENDER
// =========================
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});