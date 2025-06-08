const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB models
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    username: String,
    name: String,
  })
);

const Message = mongoose.model(
  "Message",
  new mongoose.Schema({
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  })
);

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ error: "Token format is 'Bearer <token>'" });

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Routes

// Send message
app.post("/api/chat/send", authMiddleware, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.userId;

  if (!receiverId || !message || !message.trim())
    return res.status(400).json({ error: "Receiver and message required." });

  try {
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      message: message.trim(),
    });
    const savedMessage = await newMessage.save();
    const populatedMessage = await savedMessage.populate("sender", "username");

    // Emit via Socket.IO
    io.to(receiverId.toString()).emit("receiveMessage", populatedMessage);
    io.to(senderId.toString()).emit("receiveMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message." });
  }
});

// Get chat history
app.get("/api/chat/history/:otherUserId", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const otherUserId = req.params.otherUserId;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate("sender", "username");

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

// Socket.IO
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("join", (userId) => {
    console.log(`User joined room: ${userId}`);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error(err));
