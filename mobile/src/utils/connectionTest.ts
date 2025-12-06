// Connection test utility
import axios from "axios";
import { API_BASE_URL } from "../config/api";

export const testConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log("🔍 Testing connection to:", API_BASE_URL);
    
    // Try to reach the health check endpoint
    const response = await axios.get(`${API_BASE_URL.replace("/api", "")}/ping`, {
      timeout: 5000,
    });
    
    if (response.data?.message === "Backend running") {
      return {
        success: true,
        message: "✅ Connection successful! Backend is reachable.",
      };
    }
    
    return {
      success: false,
      message: "⚠️ Backend responded but with unexpected data.",
    };
  } catch (error: any) {
    console.error("❌ Connection test failed:", error);
    
    if (error.code === "ECONNREFUSED") {
      return {
        success: false,
        message: `❌ Connection refused. Check:\n1. Backend is running\n2. URL is correct: ${API_BASE_URL}\n3. For physical device, use your computer's IP (not localhost)`,
      };
    }
    
    if (error.code === "ENOTFOUND") {
      return {
        success: false,
        message: `❌ Host not found. Check URL: ${API_BASE_URL}`,
      };
    }
    
    if (error.code === "ETIMEDOUT") {
      return {
        success: false,
        message: `❌ Connection timeout. Check:\n1. Backend is running\n2. Firewall allows port 5000\n3. Device and computer on same network`,
      };
    }
    
    return {
      success: false,
      message: `❌ Connection failed: ${error.message || "Unknown error"}`,
    };
  }
};

