import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  // Messages storage
  getMessages: async (): Promise<any[]> => {
    const messages = await AsyncStorage.getItem("messages");
    return messages ? JSON.parse(messages) : [];
  },

  saveMessage: async (message: any) => {
    const messages = await storage.getMessages();
    if (!messages.find((m) => m.messageId === message.messageId)) {
      messages.push(message);
      messages.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      await AsyncStorage.setItem("messages", JSON.stringify(messages));
    }
  },

  saveMessages: async (messages: any[]) => {
    const existing = await storage.getMessages();
    const existingIds = new Set(existing.map((m) => m.messageId));
    const newMessages = messages.filter((m) => !existingIds.has(m.messageId));
    if (newMessages.length > 0) {
      const allMessages = [...existing, ...newMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      await AsyncStorage.setItem("messages", JSON.stringify(allMessages));
    }
  },

  clearMessages: async () => {
    await AsyncStorage.removeItem("messages");
  },

  // Encryption key storage
  getEncryptionKey: async (): Promise<string | null> => {
    return await AsyncStorage.getItem("encryptionKey");
  },

  setEncryptionKey: async (key: string) => {
    await AsyncStorage.setItem("encryptionKey", key);
  },

  // Auth storage
  getAuth: async () => {
    const [accessToken, refreshToken, deviceId, userId] = await AsyncStorage.multiGet([
      "accessToken",
      "refreshToken",
      "deviceId",
      "userId",
    ]);
    return {
      accessToken: accessToken[1],
      refreshToken: refreshToken[1],
      deviceId: deviceId[1],
      userId: userId[1],
    };
  },

  setAuth: async (auth: {
    accessToken: string;
    refreshToken: string;
    deviceId: string;
    userId: string;
  }) => {
    await AsyncStorage.multiSet([
      ["accessToken", auth.accessToken],
      ["refreshToken", auth.refreshToken],
      ["deviceId", auth.deviceId],
      ["userId", auth.userId],
    ]);
  },

  clearAuth: async () => {
    await AsyncStorage.multiRemove([
      "accessToken",
      "refreshToken",
      "deviceId",
      "userId",
    ]);
  },
};

