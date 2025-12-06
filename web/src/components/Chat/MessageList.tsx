"use client";

import { format } from "date-fns";

interface Message {
  messageId: string;
  senderDeviceId: string;
  senderDeviceType: string;
  timestamp: string;
  decryptedContent?: string;
}

interface MessageListProps {
  messages: Message[];
  currentDeviceId?: string | null;
}

export default function MessageList({ messages, currentDeviceId }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No messages yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Start a conversation by sending a message
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isOwn = message.senderDeviceId === currentDeviceId;
        const deviceLabel = message.senderDeviceType === "web" ? "Web" : "Mobile";

        return (
          <div
            key={message.messageId}
            className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                isOwn
                  ? "bg-blue-600 text-white rounded-br-none"
                  : "bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none border border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="text-sm mb-1 opacity-80">
                {deviceLabel} • {format(new Date(message.timestamp), "HH:mm")}
              </div>
              <div className="text-base break-words">
                {message.decryptedContent || "[Encrypted]"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

