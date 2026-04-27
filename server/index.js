require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const authRoutes = require("./routes/auth");
const Message = require("./models/message"); // ✅ ADD THIS

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use(express.static("client"));

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

// Socket setup (ONLY ONCE)
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("loadMessages", async () => {
    const messages = await Message.find().sort({ createdAt: 1 });
    socket.emit("messageHistory", messages);
  });

  socket.on("sendMessage", async (data) => {
    const newMessage = new Message(data);
    await newMessage.save();

    io.emit("receiveMessage", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});