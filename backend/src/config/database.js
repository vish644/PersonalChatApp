import mongoose from "mongoose";

const DEFAULT_MONGO_URI = "mongodb://localhost:27018/personal-chat-app";
const MAX_MONGO_RETRIES = 10;
const MONGO_RETRY_DELAY_MS = 3000;

export const connectMongoDB = async () => {
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || DEFAULT_MONGO_URI;

  for (let attempt = 1; attempt <= MAX_MONGO_RETRIES; attempt += 1) {
    try {
      await mongoose.connect(mongoUri);
      console.log("✅ MongoDB connected");
      return;
    } catch (error) {
      console.error(
        `❌ MongoDB connection error (attempt ${attempt}/${MAX_MONGO_RETRIES}):`,
        error.message || error,
      );
      if (attempt === MAX_MONGO_RETRIES) {
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, MONGO_RETRY_DELAY_MS));
    }
  }
};
