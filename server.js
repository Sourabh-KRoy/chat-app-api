const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(express.json());
app.use(cors());

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Make io available in routes
app.set("io", io);

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => console.error(err));

// Socket.io logic
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join", (userId) => {
    console.log(`User joined room: ${userId}`);
    socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
