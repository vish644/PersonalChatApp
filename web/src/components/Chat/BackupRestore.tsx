"use client";

import { useState } from "react";
import { messageAPI } from "@/lib/api";
import { storage } from "@/lib/storage";
import { decrypt } from "@/lib/encryption";

interface BackupRestoreProps {
  encryptionKey: string | null;
}

export default function BackupRestore({ encryptionKey }: BackupRestoreProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleExport = async () => {
    if (!encryptionKey) {
      setMessage("Encryption not initialized");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await messageAPI.exportBackup();
      const backup = response.data;

      // Decrypt messages for backup (optional - you can keep encrypted)
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

      // Download as JSON file
      const blob = new Blob([JSON.stringify(backupWithDecrypted, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage("Backup exported successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Export failed");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleImport = async () => {
    if (!encryptionKey) {
      setMessage("Encryption not initialized");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      setMessage("");

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (!backup.messages || !Array.isArray(backup.messages)) {
          throw new Error("Invalid backup format");
        }

        // Import backup
        await messageAPI.importBackup({ messages: backup.messages });

        setMessage("Backup imported successfully! Refresh to see messages.");
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error: any) {
        setMessage(error.message || "Import failed");
        setTimeout(() => setMessage(""), 3000);
      } finally {
        setLoading(false);
        setShowMenu(false);
      }
    };
    input.click();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
      >
        ☰ Menu
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <button
              onClick={handleExport}
              disabled={loading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg disabled:opacity-50"
            >
              {loading ? "Exporting..." : "📥 Export Backup"}
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg disabled:opacity-50"
            >
              {loading ? "Importing..." : "📤 Import Backup"}
            </button>
          </div>
        </>
      )}

      {message && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-30">
          {message}
        </div>
      )}
    </div>
  );
}
