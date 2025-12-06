import bcrypt from "bcrypt";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User.js";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.js";
import { getRedisClient } from "../config/redis.js";

export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user (generate a shared encryption key for this account)
    const encryptionKey = crypto.randomBytes(32).toString("hex");
    const user = new User({
      email: email.toLowerCase(),
      passwordHash,
      name: name || "",
      devices: [],
      encryptionKey,
    });

    await user.save();

    console.log(`✅ User registered: ${email} (ID: ${user._id})`);

    res.status(201).json({
      message: "User registered successfully",
      userId: user._id,
      encryptionKey: user.encryptionKey,
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, deviceType = "web", deviceName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate device ID
    const deviceId = uuidv4();
    const accessToken = generateAccessToken(user._id.toString(), deviceId);
    const refreshToken = generateRefreshToken(user._id.toString(), deviceId);

    // Add device to user
    user.devices.push({
      deviceId,
      deviceType,
      deviceName: deviceName || `${deviceType} device`,
      lastActive: new Date(),
      sessionToken: accessToken,
    });

    // Ensure user has an encryption key
    if (!user.encryptionKey) {
      user.encryptionKey = crypto.randomBytes(32).toString("hex");
    }

    await user.save();

    console.log(
      `✅ User logged in: ${email} (Device: ${deviceType}, ID: ${deviceId})`
    );

    res.json({
      accessToken,
      refreshToken,
      deviceId,
      userId: user._id,
      encryptionKey: user.encryptionKey,
    });
  } catch (error) {
    console.error("❌ Login error:", error.message || error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const { verifyRefreshToken } = await import("../utils/jwt.js");
    const decoded = verifyRefreshToken(token);

    if (!decoded) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(
      decoded.userId,
      decoded.deviceId
    );
    const newRefreshToken = generateRefreshToken(
      decoded.userId,
      decoded.deviceId
    );

    // Update device session token
    const device = user.devices.find((d) => d.deviceId === decoded.deviceId);
    if (device) {
      device.sessionToken = newAccessToken;
      device.lastActive = new Date();
      await user.save();
      console.log(
        `🔄 Token refreshed: User ${decoded.userId} (Device: ${decoded.deviceId})`
      );
    }

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("❌ Token refresh error:", error.message || error);
    res.status(500).json({ error: "Token refresh failed" });
  }
};

export const generateQRToken = async (req, res) => {
  try {
    const userId = req.userId;
    const redis = getRedisClient();

    // Generate temporary QR token (expires in 5 minutes)
    const qrToken = uuidv4();
    const qrData = {
      userId: userId.toString(),
      deviceId: req.deviceId,
      timestamp: Date.now(),
    };

    // Store in Redis with 5 minute expiry
    await redis.setEx(`qr:${qrToken}`, 300, JSON.stringify(qrData));

    console.log(
      `📱 QR token generated: User ${userId} (Device: ${
        req.deviceId
      }) - Token: ${qrToken.substring(0, 8)}...`
    );

    res.json({
      qrToken,
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
    console.error("❌ QR token generation error:", error.message || error);
    res.status(500).json({ error: "Failed to generate QR token" });
  }
};

export const validateQRToken = async (req, res) => {
  try {
    const { qrToken, deviceType = "mobile", deviceName } = req.body;

    console.log(
      `📱 QR validation request received - Token: ${
        qrToken ? qrToken.substring(0, 8) + "..." : "missing"
      }`
    );

    if (!qrToken) {
      console.log("❌ QR validation failed: No token provided");
      return res.status(400).json({ error: "QR token required" });
    }

    const redis = getRedisClient();
    const qrDataStr = await redis.get(`qr:${qrToken}`);

    if (!qrDataStr) {
      console.log(
        `❌ QR validation failed: Token not found or expired - ${qrToken.substring(
          0,
          8
        )}...`
      );
      return res.status(401).json({ error: "Invalid or expired QR token" });
    }

    const qrData = JSON.parse(qrDataStr);
    console.log(`🔍 QR token found for user: ${qrData.userId}`);

    const user = await User.findById(qrData.userId);

    if (!user) {
      console.log(`❌ QR validation failed: User not found - ${qrData.userId}`);
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new device ID for mobile
    const deviceId = uuidv4();
    const accessToken = generateAccessToken(qrData.userId, deviceId);
    const refreshToken = generateRefreshToken(qrData.userId, deviceId);

    // Add device to user
    user.devices.push({
      deviceId,
      deviceType,
      deviceName: deviceName || `${deviceType} device`,
      lastActive: new Date(),
      sessionToken: accessToken,
    });

    // Ensure user has an encryption key
    if (!user.encryptionKey) {
      user.encryptionKey = crypto.randomBytes(32).toString("hex");
    }

    await user.save();

    // Delete QR token (single use)
    await redis.del(`qr:${qrToken}`);

    console.log(
      `✅ QR login successful: User ${qrData.userId} (Device: ${deviceType}, ID: ${deviceId})`
    );

    res.json({
      accessToken,
      refreshToken,
      deviceId,
      userId: qrData.userId,
      encryptionKey: user.encryptionKey,
    });
  } catch (error) {
    console.error("❌ QR validation error:", error.message || error);
    console.error("   Stack:", error.stack);
    res.status(500).json({
      error: "QR validation failed",
      message: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const user = req.user;
    const deviceId = req.deviceId;

    // Remove device from user
    user.devices = user.devices.filter((d) => d.deviceId !== deviceId);
    await user.save();

    console.log(`✅ User logged out: ${user.email} (Device ID: ${deviceId})`);

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
};

// Debug endpoint: Get current user's encryption key (for diagnostic purposes only)
export const getDebugInfo = async (req, res) => {
  try {
    const user = req.user;
    const deviceId = req.deviceId;

    const device = user.devices.find((d) => d.deviceId === deviceId);
    const sessionMatch =
      device &&
      device.sessionToken === (req.headers.authorization?.substring(7) || "");

    res.json({
      userId: user._id,
      email: user.email,
      encryptionKeyPreview: user.encryptionKey
        ? user.encryptionKey.substring(0, 8) +
          "..." +
          user.encryptionKey.substring(user.encryptionKey.length - 8)
        : "NOT_SET",
      encryptionKeyLength: user.encryptionKey ? user.encryptionKey.length : 0,
      deviceId,
      deviceFound: !!device,
      sessionTokenMatch: sessionMatch,
      devicesCount: user.devices.length,
    });
  } catch (error) {
    console.error("❌ Debug info error:", error);
    res.status(500).json({ error: "Failed to get debug info" });
  }
};
