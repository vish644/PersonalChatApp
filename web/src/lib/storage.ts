// Local storage utilities for messages and encryption keys

export const storage = {
  // Messages storage
  getMessages: (): any[] => {
    if (typeof window === "undefined") return [];
    const messages = localStorage.getItem("messages");
    return messages ? JSON.parse(messages) : [];
  },

  saveMessage: (message: any) => {
    if (typeof window === "undefined") return;
    const messages = storage.getMessages();
    // Avoid duplicates
    if (!messages.find((m) => m.messageId === message.messageId)) {
      messages.push(message);
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      localStorage.setItem("messages", JSON.stringify(messages));
    }
  },

  saveMessages: (messages: any[]) => {
    if (typeof window === "undefined") return;
    const existing = storage.getMessages();
    const existingIds = new Set(existing.map((m) => m.messageId));
    const newMessages = messages.filter((m) => !existingIds.has(m.messageId));
    if (newMessages.length > 0) {
      const allMessages = [...existing, ...newMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      localStorage.setItem("messages", JSON.stringify(allMessages));
    }
  },

  clearMessages: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("messages");
  },

  // Encryption key storage (in production, use secure storage)
  getEncryptionKey: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("encryptionKey");
  },

  setEncryptionKey: (key: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("encryptionKey", key);
  },

  // Auth storage
  getAuth: () => {
    if (typeof window === "undefined") return null;
    return {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
      deviceId: localStorage.getItem("deviceId"),
      userId: localStorage.getItem("userId"),
    };
  },

  setAuth: (auth: {
    accessToken: string;
    refreshToken: string;
    deviceId: string;
    userId: string;
  }) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", auth.accessToken);
    localStorage.setItem("refreshToken", auth.refreshToken);
    localStorage.setItem("deviceId", auth.deviceId);
    localStorage.setItem("userId", auth.userId);
  },

  clearAuth: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("deviceId");
    localStorage.removeItem("userId");
  },
};

