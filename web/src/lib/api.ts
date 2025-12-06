import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("deviceId");
          localStorage.removeItem("userId");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, password: string, name?: string) =>
    api.post("/auth/register", { email, password, name }),
  login: (email: string, password: string, deviceType?: string, deviceName?: string) =>
    api.post("/auth/login", { email, password, deviceType, deviceName }),
  refreshToken: (data: { refreshToken: string }) =>
    api.post("/auth/refresh", data),
  getQRToken: () => api.get("/auth/qr-token"),
  logout: () => api.post("/auth/logout"),
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

