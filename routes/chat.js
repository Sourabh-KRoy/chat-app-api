const express = require("express");
const Message = require("../models/Message");
const authMiddleware = require("./authMiddleware");

const router = express.Router();

// Send a message
router.post("/send", authMiddleware, async (req, res) => {
  const { receiverId, message } = req.body;
  const senderId = req.userId;

  if (!receiverId || !message?.trim()) {
    return res.status(400).json({ error: "Receiver and message required." });
  }

  try {
    const newMessage = new Message({ sender: senderId, receiver: receiverId, message: message.trim() });
    const savedMessage = await newMessage.save();
    const populatedMessage = await savedMessage.populate("sender", "username");

    const io = req.app.get("io"); // Access io instance
    io.to(receiverId.toString()).emit("receiveMessage", populatedMessage);
    io.to(senderId.toString()).emit("receiveMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ error: "Failed to send message." });
  }
});

// Get chat history
router.get("/history/:otherUserId", authMiddleware, async (req, res) => {
  const userId = req.userId;
  const otherUserId = req.params.otherUserId;

  try {
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
    res.status(500).json({ error: "Failed to fetch chat history." });
  }
});

module.exports = router;
