import { useEffect } from "react";
import axios from "axios";
import { storage } from "../lib/storage";
import { disconnectSocket } from "../lib/socket";
import { API_BASE_URL } from "../config/api";

// Refresh token every 14 minutes (before 15 min expiry)
export const useTokenRefresh = () => {
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const auth = await storage.getAuth();
        const refreshToken = auth?.refreshToken;
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          const { accessToken, refreshToken: newRefreshToken } = response.data;

          await storage.setAuth({
            ...auth!,
            accessToken,
            refreshToken: newRefreshToken,
          });

          // Disconnect and reconnect socket with new token to re-authenticate
          disconnectSocket();
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, []);
};
