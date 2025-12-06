import { useEffect } from "react";
import { authAPI } from "@/lib/api";
import { storage } from "@/lib/storage";

// Refresh token every 14 minutes (before 15 min expiry)
export const useTokenRefresh = () => {
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const refreshToken = storage.getAuth()?.refreshToken;
        if (refreshToken) {
          const response = await authAPI.refreshToken({ refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data;
          
          const auth = storage.getAuth();
          if (auth) {
            storage.setAuth({
              ...auth,
              accessToken,
              refreshToken: newRefreshToken,
            });
          }
        }
      } catch (error) {
        console.error("Token refresh failed:", error);
        // Will be handled by API interceptor
      }
    }, 14 * 60 * 1000); // 14 minutes

    return () => clearInterval(refreshInterval);
  }, []);
};

