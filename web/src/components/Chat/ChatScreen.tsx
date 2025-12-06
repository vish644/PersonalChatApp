"use client";

import { useEffect, useState, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";
import { storage } from "@/lib/storage";
import { encrypt, decrypt, getOrCreateEncryptionKey } from "@/lib/encryption";
import { messageAPI } from "@/lib/api";
import { format } from "date-fns";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import QRCodeModal from "./QRCodeModal";
import BackupRestore from "./BackupRestore";

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
  const [loading, setLoading] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [offline, setOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useTokenRefresh(); // Auto-refresh tokens every 14 minutes

  useEffect(() => {
    initializeChat();
    return () => {
      disconnectSocket();
    };
  }, []);

  const initializeChat = async () => {
    try {
      // Get encryption key as hex string (consistent with mobile)
      const keyHex = await getOrCreateEncryptionKey();
      setEncryptionKey(keyHex);

      // Log key parity check for debugging key mismatch issues
      console.log(
        `🔑 Encryption key loaded (first 8: ${keyHex.substring(
          0,
          8
        )}...${keyHex.substring(keyHex.length - 8)})`
      );

      // Load messages from storage
      const storedMessages = storage.getMessages();
      if (storedMessages.length > 0) {
        // Decrypt stored messages
        const decrypted = await Promise.all(
          storedMessages.map(async (msg) => ({
            ...msg,
            decryptedContent: await decrypt(msg.encryptedContent, keyHex).catch(
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
      }

      // Decrypt and merge with local messages
      const decryptedServer = await Promise.all(
        serverMessages.map(async (msg: any) => ({
          ...msg,
          decryptedContent: await decrypt(msg.encryptedContent, keyHex).catch(
            () => "[Decryption failed]"
          ),
        }))
      );

      // Merge and deduplicate
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
      storage.saveMessages(
        allMessages.map(({ decryptedContent, ...rest }) => rest)
      );

      // Connect socket
      const auth = storage.getAuth();
      if (auth?.accessToken) {
        const socket = connectSocket(auth.accessToken);

        socket.on("message:new", async (data: any) => {
          try {
            // Use the stored hex string key for decryption
            const decryptedContent = await decrypt(
              data.encryptedContent,
              keyHex
            );
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

            storage.saveMessage(data);
          } catch (error) {
            console.error("Failed to decrypt new message:", error);
          }
        });

        socket.on("connect", () => {
          setOffline(false);
          // Request sync
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
                decryptedContent: await decrypt(
                  msg.encryptedContent,
                  keyHex
                ).catch(() => "[Decryption failed]"),
              }))
            );

            setMessages((prev) => {
              const merged = [...prev, ...decrypted]
                .filter(
                  (msg, index, self) =>
                    index ===
                    self.findIndex((m) => m.messageId === msg.messageId)
                )
                .sort(
                  (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime()
                );
              return merged;
            });

            storage.saveMessages(syncMessages);
          }
        });
      }
    } catch (error) {
      console.error("Chat initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!encryptionKey || !text.trim()) return;

    try {
      // Encrypt with the stored hex string key
      const encrypted = await encrypt(text, encryptionKey);
      const auth = storage.getAuth();
      const deviceId = auth?.deviceId;

      // Send via socket if online
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("message:send", { encryptedContent: encrypted });
      } else {
        // Queue for later if offline
        const tempMessage = {
          messageId: `temp-${Date.now()}`,
          encryptedContent: encrypted,
          senderDeviceId: deviceId || "",
          senderDeviceType: "web",
          timestamp: new Date().toISOString(),
          decryptedContent: text,
        };
        setMessages((prev) => [...prev, tempMessage]);
        storage.saveMessage(tempMessage);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Personal Chat
        </h1>
        <div className="flex items-center gap-3">
          {offline && (
            <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-1 rounded">
              Offline
            </span>
          )}
          <button
            onClick={() => setShowQR(true)}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
          >
            Login on Mobile
          </button>
          <BackupRestore encryptionKey={encryptionKey} />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <MessageList
          messages={messages}
          currentDeviceId={storage.getAuth()?.deviceId}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={!encryptionKey} />

      {/* QR Modal */}
      {showQR && <QRCodeModal onClose={() => setShowQR(false)} />}
    </div>
  );
}
