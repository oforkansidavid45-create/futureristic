require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// Socket setup (real-time chat)
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("sendMessage", (msg) => {
    io.emit("receiveMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});