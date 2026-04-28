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

// HEALTH CHECK (RENDER NEEDS THIS)
app.get("/", (req, res) => {
  res.status(200).send("Chat server running 🚀");
});

// =========================
// DATABASE
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB Error:", err));

// =========================
// SOCKET
// =========================
const io = new Server(server, {
  cors: { origin: "*" }
});

let onlineUsers = {};

function getRoomId(a, b) {
  return [a, b].sort().join("-");
}

io.on("connection", (socket) => {

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
    const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
    socket.emit("roomMessages", messages);
  });

  socket.on("sendPrivateMessage", async ({ from, to, text }) => {
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
  });

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
  console.log("Server running on", PORT);
});