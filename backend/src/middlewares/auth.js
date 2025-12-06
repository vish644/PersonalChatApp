import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/User.js";

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("🔐 Auth: No token provided");
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const tokenPreview =
      token.substring(0, 8) + "..." + token.substring(token.length - 4);
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      console.warn(`🔐 Auth: Invalid/expired token (${tokenPreview})`);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      console.warn(`🔐 Auth: User not found (userId: ${decoded.userId})`);
      return res.status(401).json({ error: "User not found" });
    }

    // Verify device exists and is active
    const device = user.devices.find((d) => d.deviceId === decoded.deviceId);
    if (!device) {
      console.warn(
        `🔐 Auth: Device not found (deviceId: ${decoded.deviceId.substring(
          0,
          8
        )}...)`
      );
      return res.status(401).json({ error: "Device session invalid" });
    }

    if (device.sessionToken !== token) {
      const storedTokenPreview = device.sessionToken
        ? device.sessionToken.substring(0, 8) + "..."
        : "none";
      console.warn(
        `🔐 Auth: Token mismatch for device ${decoded.deviceId.substring(
          0,
          8
        )}... (token: ${tokenPreview}, stored: ${storedTokenPreview})`
      );
      return res.status(401).json({ error: "Device session invalid" });
    }

    req.user = user;
    req.deviceId = decoded.deviceId;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("🔐 Auth: Unexpected error:", error.message);
    res.status(401).json({ error: "Authentication failed" });
  }
};
