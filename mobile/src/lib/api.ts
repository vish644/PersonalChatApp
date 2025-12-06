import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";


export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Attach token before each request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          await AsyncStorage.setItem("accessToken", accessToken);
          await AsyncStorage.setItem("refreshToken", newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear storage
        await AsyncStorage.multiRemove([
          "accessToken",
          "refreshToken",
          "deviceId",
          "userId",
        ]);
        // Navigate to login (handled by app)
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  validateQRToken: async (qrToken: string, deviceType?: string, deviceName?: string) => {
    console.log("📡 Sending QR validation request to:", `${API_BASE_URL}/auth/qr-validate`);
    console.log("📡 Full URL:", `${API_BASE_URL}/auth/qr-validate`);
    console.log("📡 Request payload:", { qrToken: qrToken.substring(0, 10) + "...", deviceType, deviceName });
    
    try {
      const response = await api.post("/auth/qr-validate", { qrToken, deviceType, deviceName });
      console.log("✅ QR validation response received");
      return response;
    } catch (error: any) {
      console.error("❌ QR validation request failed");
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);
      console.error("   Error response:", error.response?.data);
      console.error("   Error status:", error.response?.status);
      console.error("   Full error:", JSON.stringify(error, null, 2));
      
      // Handle different types of network errors
      if (
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        error.code === "ETIMEDOUT" ||
        error.code === "ECONNABORTED" ||
        error.message?.includes("Network") ||
        error.message?.includes("network") ||
        error.message?.includes("timeout") ||
        error.message?.includes("Timeout") ||
        !error.response
      ) {
        const networkError = new Error("NETWORK_ERROR");
        (networkError as any).code = error.code || "NETWORK_ERROR";
        (networkError as any).isNetworkError = true;
        (networkError as any).originalMessage = error.message;
        throw networkError;
      }
      
      throw error;
    }
  },
};

export const messageAPI = {
  send: (encryptedContent: string) =>
    api.post("/messages/send", { encryptedContent }),
  getAll: (limit?: number, before?: string) =>
    api.get("/messages", { params: { limit, before } }),
  exportBackup: () => api.get("/messages/export"),
  importBackup: (backup: any) => api.post("/messages/import", backup),
};

export default api;

