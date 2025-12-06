"use client";

import { useEffect, useState } from "react";
import { authAPI } from "@/lib/api";
import QRCode from "qrcode";

interface QRCodeModalProps {
  onClose: () => void;
}

export default function QRCodeModal({ onClose }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expiresIn, setExpiresIn] = useState(300);

  useEffect(() => {
    generateQRCode();
    const interval = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const generateQRCode = async () => {
    try {
      const response = await authAPI.getQRToken();
      const { qrToken, expiresIn: exp } = response.data;
      setExpiresIn(exp);

      // Generate QR code
      const qrUrl = `${process.env.NEXT_PUBLIC_MOBILE_APP_URL || "personalchat://qr-login"}?token=${qrToken}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrDataUrl(dataUrl);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to generate QR code");
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Login on Mobile
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={generateQRCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Scan this QR code with your mobile app
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <span>⏱️</span>
                <span>Expires in {formatTime(expiresIn)}</span>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Open the mobile app and scan this code to log in
            </p>
          </>
        )}
      </div>
    </div>
  );
}

