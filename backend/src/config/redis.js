import { createClient } from "redis";

let redisClient = null;
const MAX_REDIS_RETRIES = 10;
const REDIS_RETRY_DELAY_MS = 3000;

export const connectRedis = async () => {
  const redisUri = process.env.REDIS_URI || "redis://localhost:6379";
  const isCloudRedis =
    redisUri.includes("upstash.io") ||
    redisUri.includes("redis.com") ||
    redisUri.includes("redislabs.com");

  let normalizedUri = redisUri;
  if (normalizedUri.startsWith("https://")) {
    normalizedUri = normalizedUri.replace("https://", "rediss://");
  } else if (
    !normalizedUri.startsWith("redis://") &&
    !normalizedUri.startsWith("rediss://")
  ) {
    normalizedUri = `redis://${normalizedUri}`;
  }

  const config = {
    url: normalizedUri,
  };

  if (isCloudRedis || normalizedUri.startsWith("rediss://")) {
    if (process.env.REDIS_TOKEN) {
      config.password = process.env.REDIS_TOKEN;
    }
    config.socket = {
      tls: true,
      rejectUnauthorized: false,
    };
  } else if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }

  for (let attempt = 1; attempt <= MAX_REDIS_RETRIES; attempt += 1) {
    try {
      redisClient = createClient(config);
      redisClient.on("error", (err) =>
        console.error("Redis Client Error", err),
      );
      redisClient.on("connect", () => console.log("✅ Redis connected"));

      await redisClient.connect();
      return redisClient;
    } catch (error) {
      console.error(
        `❌ Redis connection error (attempt ${attempt}/${MAX_REDIS_RETRIES}):`,
        error.message || error,
      );
      if (attempt === MAX_REDIS_RETRIES) {
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, REDIS_RETRY_DELAY_MS));
    }
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};
