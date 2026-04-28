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
// DB CONNECT
// =========================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// =========================
// SOCKET.IO SETUP
// =========================
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// 👤 ONLINE USERS
let onlineUsers = {};

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
  // TYPING
  // =========================
  socket.on("typing", (username) => {
    socket.broadcast.emit("showTyping", username);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("hideTyping");
  });

  // =========================
  // LOAD MESSAGES
  // =========================
  socket.on("loadMessages", async () => {
    const messages = await Message.find().sort({ createdAt: 1 });
    socket.emit("messageHistory", messages);
  });

  // =========================
  // SEND MESSAGE (PRO VERSION)
  // =========================
  socket.on("sendMessage", async (data) => {

    const message = new Message({
      user: data.user,
      text: data.text,
      status: "sent",
      createdAt: new Date()
    });

    await message.save();

    // send to everyone
    io.emit("receiveMessage", {
      ...data,
      status: "delivered"
    });
  });

  // =========================
  // READ RECEIPT (NEW PRO FEATURE)
  // =========================
  socket.on("messageRead", async (messageId) => {
    await Message.findByIdAndUpdate(messageId, {
      status: "read"
    });

    io.emit("messageUpdated", {
      messageId,
      status: "read"
    });
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