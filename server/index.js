require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
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
// ROUTES
// =========================
app.use("/api/auth", authRoutes);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// =========================
// DATABASE
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// =========================
// SOCKET.IO
// =========================
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// =========================
// ONLINE USERS
// =========================
let onlineUsers = {};

// =========================
// ROOM HELPER
// =========================
function getRoomId(user1, user2) {
  return [user1, user2].sort().join("-");
}

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  // =========================
  // JOIN USER
  // =========================
  socket.on("join", (username) => {
    if (!username) return;

    socket.username = username;
    onlineUsers[socket.id] = username;

    io.emit("updateOnlineUsers", Object.values(onlineUsers));
  });

  // =========================
  // JOIN ROOM (PRIVATE CHAT)
  // =========================
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
  });

  // =========================
  // LOAD ROOM MESSAGES
  // =========================
  socket.on("loadRoomMessages", async (roomId) => {
    try {
      const messages = await Message.find({ roomId }).sort({ createdAt: 1 });
      socket.emit("roomMessages", messages);
    } catch (err) {
      console.log("Load room error:", err);
    }
  });

  // =========================
  // SEND PRIVATE MESSAGE
  // =========================
  socket.on("sendPrivateMessage", async (data) => {
    try {
      const { from, to, text } = data;

      const roomId = getRoomId(from, to);

      const message = new Message({
        user: from,
        text,
        roomId,
        status: "sent",
        createdAt: new Date()
      });

      await message.save();

      io.to(roomId).emit("receivePrivateMessage", {
        user: from,
        text,
        roomId,
        status: "delivered"
      });

    } catch (err) {
      console.log("Send message error:", err);
    }
  });

  // =========================
  // TYPING
  // =========================
  socket.on("typing", (username) => {
    socket.broadcast.emit("showTyping", username);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("hideTyping");
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    delete onlineUsers[socket.id];

    io.emit("updateOnlineUsers", Object.values(onlineUsers));

    console.log("User disconnected:", socket.id);
  });

});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});