import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key-change-in-production";

// Access token expires in 15 minutes
export const generateAccessToken = (userId, deviceId) => {
  return jwt.sign(
    { userId, deviceId, type: "access" },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// Refresh token expires in 7 days
export const generateRefreshToken = (userId, deviceId) => {
  return jwt.sign(
    { userId, deviceId, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

