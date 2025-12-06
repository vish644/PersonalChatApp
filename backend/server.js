import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { connectMongoDB } from "./src/config/database.js";
import { connectRedis } from "./src/config/redis.js";
import authRoutes from "./src/routes/authRoutes.js";
import messageRoutes from "./src/routes/messageRoutes.js";
import { setupSocketIO } from "./src/socket/socketHandler.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.io setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());

// Morgan HTTP request logger - detailed format for API calls
// Must be after express.json() to access req.body
morgan.token("body", (req) => {
  // Log request body for POST/PUT requests (excluding sensitive data)
  if (req.method === "POST" || req.method === "PUT") {
    const body = { ...req.body };
    // Hide sensitive fields
    if (body.password) body.password = "***";
    if (body.passwordHash) body.passwordHash = "***";
    if (body.accessToken) body.accessToken = "***";
    if (body.refreshToken) body.refreshToken = "***";
    if (body.encryptedContent) body.encryptedContent = body.encryptedContent.substring(0, 20) + "...";
    return JSON.stringify(body);
  }
  return "-";
});

morgan.token("auth", (req) => {
  // Log if request has authorization header (without showing the token)
  return req.headers.authorization ? "Bearer ***" : "-";
});

morgan.token("user-agent", (req) => {
  return req.get("user-agent") || "-";
});

// Custom format with detailed information
const logFormat = ":method :url :status :response-time ms - :res[content-length] bytes - :remote-addr - :auth - User-Agent: :user-agent - Body: :body";

app.use(
  morgan(logFormat, {
    // Skip logging for health checks
    skip: (req) => req.url === "/ping",
  })
);

// Health check - accessible without auth
app.get("/ping", (req, res) => {
  console.log(`🏓 Health check from: ${req.ip}`);
  res.json({ 
    message: "Backend running",
    timestamp: new Date().toISOString(),
    ip: req.ip
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// Setup Socket.io
setupSocketIO(io);

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectMongoDB();
    await connectRedis();
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
