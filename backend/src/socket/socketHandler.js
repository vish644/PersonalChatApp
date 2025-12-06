import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { v4 as uuidv4 } from "uuid";

export const setupSocketIO = (io) => {
  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error("Authentication error: No token"));
      }

      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      const device = user.devices.find(d => d.deviceId === decoded.deviceId);
      if (!device || device.sessionToken !== token) {
        return next(new Error("Authentication error: Device invalid"));
      }

      socket.userId = decoded.userId.toString();
      socket.deviceId = decoded.deviceId;
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Device connected: ${socket.deviceId} (User: ${socket.userId})`);

    // Join user's room for message broadcasting
    socket.join(`user:${socket.userId}`);

    // Handle new message
    socket.on("message:send", async (data) => {
      try {
        const { encryptedContent } = data;

        if (!encryptedContent) {
          socket.emit("message:error", { error: "Message content required" });
          return;
        }

        const senderDevice = socket.user.devices.find(d => d.deviceId === socket.deviceId);
        if (!senderDevice) {
          socket.emit("message:error", { error: "Device not found" });
          return;
        }

        // Save message to database
        const message = new Message({
          userId: socket.userId,
          encryptedContent,
          senderDeviceId: socket.deviceId,
          senderDeviceType: senderDevice.deviceType,
          timestamp: new Date(),
          messageId: uuidv4(),
        });

        await message.save();

        // Broadcast to all user's devices (including sender for confirmation)
        const messageData = {
          messageId: message.messageId,
          encryptedContent: message.encryptedContent,
          senderDeviceId: message.senderDeviceId,
          senderDeviceType: message.senderDeviceType,
          timestamp: message.timestamp,
        };

        io.to(`user:${socket.userId}`).emit("message:new", messageData);
      } catch (error) {
        console.error("Socket message error:", error);
        socket.emit("message:error", { error: "Failed to send message" });
      }
    });

    // Handle sync request (for offline sync)
    socket.on("sync:request", async (data) => {
      try {
        const { lastSyncTimestamp } = data;
        const query = { userId: socket.userId };
        
        if (lastSyncTimestamp) {
          query.timestamp = { $gt: new Date(lastSyncTimestamp) };
        }

        const messages = await Message.find(query)
          .sort({ timestamp: 1 })
          .select("messageId encryptedContent senderDeviceId senderDeviceType timestamp");

        socket.emit("sync:response", { messages });
      } catch (error) {
        console.error("Sync error:", error);
        socket.emit("sync:error", { error: "Sync failed" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`❌ Device disconnected: ${socket.deviceId}`);
    });
  });
};

