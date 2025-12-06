import { v4 as uuidv4 } from "uuid";
import Message from "../models/Message.js";

export const sendMessage = async (req, res) => {
  try {
    const { encryptedContent } = req.body;
    const userId = req.userId;
    const deviceId = req.deviceId;
    const user = req.user;

    if (!encryptedContent) {
      return res.status(400).json({ error: "Message content required" });
    }

    // Find sender device
    const senderDevice = user.devices.find(d => d.deviceId === deviceId);
    if (!senderDevice) {
      return res.status(401).json({ error: "Device not found" });
    }

    // Create message with encrypted content
    const message = new Message({
      userId,
      encryptedContent, // Server stores encrypted, cannot read
      senderDeviceId: deviceId,
      senderDeviceType: senderDevice.deviceType,
      timestamp: new Date(),
      messageId: uuidv4(),
    });

    await message.save();

    // Return message for client-side decryption
    res.json({
      messageId: message.messageId,
      timestamp: message.timestamp,
      senderDeviceId: message.senderDeviceId,
      senderDeviceType: message.senderDeviceType,
      // Note: encryptedContent is not returned here as it's already on client
      // Client will decrypt from local storage
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 100, before } = req.query;

    const query = { userId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .select("messageId encryptedContent senderDeviceId senderDeviceType timestamp");

    res.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const exportBackup = async (req, res) => {
  try {
    const userId = req.userId;

    // Get all messages for user
    const messages = await Message.find({ userId })
      .sort({ timestamp: 1 })
      .select("messageId encryptedContent senderDeviceId senderDeviceType timestamp");

    const backup = {
      userId: userId.toString(),
      exportDate: new Date().toISOString(),
      messages: messages.map(msg => ({
        messageId: msg.messageId,
        encryptedContent: msg.encryptedContent,
        senderDeviceId: msg.senderDeviceId,
        senderDeviceType: msg.senderDeviceType,
        timestamp: msg.timestamp,
      })),
    };

    res.json(backup);
  } catch (error) {
    console.error("Export backup error:", error);
    res.status(500).json({ error: "Failed to export backup" });
  }
};

export const importBackup = async (req, res) => {
  try {
    const userId = req.userId;
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid backup format" });
    }

    // Import messages (skip duplicates by messageId)
    const existingMessageIds = new Set(
      (await Message.find({ userId }).select("messageId")).map(m => m.messageId)
    );

    const messagesToImport = messages.filter(msg => !existingMessageIds.has(msg.messageId));

    if (messagesToImport.length > 0) {
      await Message.insertMany(
        messagesToImport.map(msg => ({
          userId,
          encryptedContent: msg.encryptedContent,
          senderDeviceId: msg.senderDeviceId,
          senderDeviceType: msg.senderDeviceType,
          timestamp: msg.timestamp,
          messageId: msg.messageId,
        }))
      );
    }

    res.json({
      imported: messagesToImport.length,
      skipped: messages.length - messagesToImport.length,
    });
  } catch (error) {
    console.error("Import backup error:", error);
    res.status(500).json({ error: "Failed to import backup" });
  }
};

