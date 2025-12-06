import { createClient } from "redis";

let redisClient = null;

export const connectRedis = async () => {
  try {
    const redisUri = process.env.REDIS_URI || "redis://localhost:6379";
    
    // Check if it's a cloud Redis (Upstash/Redis Cloud) that needs TLS
    const isCloudRedis = redisUri.includes("upstash.io") || 
                         redisUri.includes("redis.com") || 
                         redisUri.includes("redislabs.com");
    
    // Normalize the URL - ensure it starts with redis:// or rediss://
    let normalizedUri = redisUri;
    if (normalizedUri.startsWith("https://")) {
      normalizedUri = normalizedUri.replace("https://", "rediss://");
    } else if (!normalizedUri.startsWith("redis://") && !normalizedUri.startsWith("rediss://")) {
      normalizedUri = `redis://${normalizedUri}`;
    }
    
    const config = {
      url: normalizedUri,
    };
    
    // Only add password/token for cloud Redis or if explicitly needed
    // Local Redis typically doesn't require a password
    if (isCloudRedis || normalizedUri.startsWith("rediss://")) {
      // Cloud Redis requires password
      if (process.env.REDIS_TOKEN) {
        config.password = process.env.REDIS_TOKEN;
      }
      // Add TLS config for cloud Redis
      config.socket = {
        tls: true,
        rejectUnauthorized: false,
      };
    } else if (process.env.REDIS_PASSWORD) {
      // Local Redis with password (optional)
      config.password = process.env.REDIS_PASSWORD;
    }
    
    redisClient = createClient(config);

    redisClient.on("error", (err) => console.error("Redis Client Error", err));
    redisClient.on("connect", () => console.log("✅ Redis connected"));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("❌ Redis connection error:", error);
    process.exit(1);
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call connectRedis() first.");
  }
  return redisClient;
};

