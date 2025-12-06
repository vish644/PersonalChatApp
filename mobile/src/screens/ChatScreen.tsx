import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { connectSocket, disconnectSocket, getSocket } from "../lib/socket";
import { storage } from "../lib/storage";
import { encrypt, decrypt, getOrCreateEncryptionKey } from "../lib/encryption";
import { messageAPI } from "../lib/api";
import { useTokenRefresh } from "../hooks/useTokenRefresh";
import { format } from "date-fns";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";

interface Message {
  messageId: string;
  encryptedContent: string;
  senderDeviceId: string;
  senderDeviceType: string;
  timestamp: string;
  decryptedContent?: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useTokenRefresh(); // Auto-refresh tokens every 14 minutes

  useEffect(() => {
    storage
      .getAuth()
      .then((auth) => setCurrentDeviceId(auth?.deviceId || null));
  }, []);

  useEffect(() => {
    initializeChat();
    return () => {
      disconnectSocket();
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Check auth
      const auth = await storage.getAuth();
      if (!auth?.accessToken) {
        router.replace("/");
        return;
      }

      // Get encryption key
      const key = await getOrCreateEncryptionKey();
      setEncryptionKey(key);

      // Log key parity check for debugging key mismatch issues
      console.log(
        `🔑 Encryption key loaded (first 8: ${key.substring(
          0,
          8
        )}...${key.substring(key.length - 8)})`
      );

      // Load messages from storage
      const storedMessages = await storage.getMessages();
      if (storedMessages.length > 0) {
        const decrypted = await Promise.all(
          storedMessages.map(async (msg) => ({
            ...msg,
            decryptedContent: await decrypt(msg.encryptedContent, key).catch(
              () => "[Decryption failed]"
            ),
          }))
        );
        // Show local messages immediately so chat opens even if server is down
        setMessages(decrypted);
      }

      // Fetch messages from server (don't crash UI on network error)
      let serverMessages: any[] = [];
      try {
        const response = await messageAPI.getAll(100);
        serverMessages = response.data.messages || [];
      } catch (err: any) {
        console.warn(
          "Message fetch failed — operating in offline mode:",
          err?.message || err
        );
        serverMessages = [];
        setOffline(true);
      }

      const decryptedServer = await Promise.all(
        serverMessages.map(async (msg: any) => ({
          ...msg,
          decryptedContent: await decrypt(msg.encryptedContent, key).catch(
            () => "[Decryption failed]"
          ),
        }))
      );

      const allMessages = [...decryptedServer, ...storedMessages]
        .filter(
          (msg, index, self) =>
            index === self.findIndex((m) => m.messageId === msg.messageId)
        )
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

      setMessages(allMessages);
      await storage.saveMessages(
        allMessages.map(({ decryptedContent, ...rest }) => rest)
      );

      // Connect socket
      const socket = await connectSocket();

      socket.on("message:new", async (data: any) => {
        try {
          const decryptedContent = await decrypt(data.encryptedContent, key);
          const newMessage = {
            ...data,
            decryptedContent,
          };

          setMessages((prev) => {
            const exists = prev.find((m) => m.messageId === data.messageId);
            if (exists) return prev;
            return [...prev, newMessage].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );
          });

          await storage.saveMessage(data);
        } catch (error) {
          console.error("Failed to decrypt new message:", error);
        }
      });

      socket.on("connect", () => {
        setOffline(false);
        socket.emit("sync:request", {
          lastSyncTimestamp:
            messages.length > 0
              ? messages[messages.length - 1].timestamp
              : null,
        });
      });

      socket.on("disconnect", () => {
        setOffline(true);
      });

      socket.on("sync:response", async (data: any) => {
        const { messages: syncMessages } = data;
        if (syncMessages && syncMessages.length > 0) {
          const decrypted = await Promise.all(
            syncMessages.map(async (msg: any) => ({
              ...msg,
              decryptedContent: await decrypt(msg.encryptedContent, key).catch(
                () => "[Decryption failed]"
              ),
            }))
          );

          setMessages((prev) => {
            const merged = [...prev, ...decrypted]
              .filter(
                (msg, index, self) =>
                  index === self.findIndex((m) => m.messageId === msg.messageId)
              )
              .sort(
                (a, b) =>
                  new Date(a.timestamp).getTime() -
                  new Date(b.timestamp).getTime()
              );
            return merged;
          });

          await storage.saveMessages(syncMessages);
        }
      });
    } catch (error) {
      console.error("Chat initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!encryptionKey || !messageText.trim()) return;

    try {
      const encrypted = await encrypt(messageText.trim(), encryptionKey);
      const auth = await storage.getAuth();
      const deviceId = auth?.deviceId;

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("message:send", { encryptedContent: encrypted });
      } else {
        const tempMessage = {
          messageId: `temp-${Date.now()}`,
          encryptedContent: encrypted,
          senderDeviceId: deviceId || "",
          senderDeviceType: "mobile",
          timestamp: new Date().toISOString(),
          decryptedContent: messageText.trim(),
        };
        setMessages((prev) => [...prev, tempMessage]);
        await storage.saveMessage(tempMessage);
      }

      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const handleExport = async () => {
    if (!encryptionKey) {
      Alert.alert("Error", "Encryption not initialized");
      return;
    }

    try {
      const response = await messageAPI.exportBackup();
      const backup = response.data;

      const decryptedMessages = await Promise.all(
        backup.messages.map(async (msg: any) => {
          try {
            const decrypted = await decrypt(
              msg.encryptedContent,
              encryptionKey
            );
            return {
              ...msg,
              decryptedContent: decrypted,
            };
          } catch {
            return msg;
          }
        })
      );

      const backupWithDecrypted = {
        ...backup,
        messages: decryptedMessages,
      };

      const fileUri = `${FileSystem.documentDirectory}chat-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(backupWithDecrypted, null, 2)
      );

      Alert.alert("Success", `Backup saved to ${fileUri}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Export failed");
    }
  };

  const handleImport = async () => {
    if (!encryptionKey) {
      Alert.alert("Error", "Encryption not initialized");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });

      if (result.canceled) return;

      const fileContent = await FileSystem.readAsStringAsync(
        result.assets[0].uri
      );
      const backup = JSON.parse(fileContent);

      if (!backup.messages || !Array.isArray(backup.messages)) {
        throw new Error("Invalid backup format");
      }

      await messageAPI.importBackup({ messages: backup.messages });

      Alert.alert("Success", "Backup imported! Refreshing...");
      setTimeout(() => {
        initializeChat();
      }, 1000);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Import failed");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderDeviceId === currentDeviceId;
    const deviceLabel = item.senderDeviceType === "web" ? "Web" : "Mobile";

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={[styles.deviceLabel, isOwn && styles.ownDeviceLabel]}>
          {deviceLabel} • {format(new Date(item.timestamp), "HH:mm")}
        </Text>
        <Text
          style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {item.decryptedContent || "[Encrypted]"}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Personal Chat</Text>
        <View style={styles.headerActions}>
          {offline && <Text style={styles.offlineBadge}>Offline</Text>}
          <TouchableOpacity onPress={handleExport} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>📥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImport} style={styles.menuButton}>
            <Text style={styles.menuButtonText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation by sending a message
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.messageId}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !messageText.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || !encryptionKey}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 10,
    color: "#6B7280",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  offlineBadge: {
    fontSize: 12,
    color: "#F97316",
    backgroundColor: "#FED7AA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  menuButton: {
    padding: 4,
  },
  menuButtonText: {
    fontSize: 20,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: "80%",
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#3B82F6",
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
  },
  deviceLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  ownDeviceLabel: {
    color: "rgba(255,255,255,0.8)",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "#FFFFFF",
  },
  otherMessageText: {
    color: "#111827",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: "#6B7280",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#111827",
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
