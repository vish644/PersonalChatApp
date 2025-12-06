import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { authAPI } from "../lib/api";
import { storage } from "../lib/storage";
import { getOrCreateEncryptionKey } from "../lib/encryption";
import { API_BASE_URL } from "../config/api";

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    console.log("📱 QR Code scanned:", data);
    console.log("🌐 Current API URL:", API_BASE_URL);
    console.log("🔍 Testing connection before login...");

    try {
      // Extract token from QR code URL
      // Handle both http:// and custom protocol URLs
      let qrToken: string | null = null;

      try {
        // Try parsing as standard URL
        const url = new URL(data);
        qrToken = url.searchParams.get("token");
      } catch {
        // If URL parsing fails, try extracting token manually
        // Format: personalchat://qr-login?token=xxx or similar
        const tokenMatch = data.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          qrToken = decodeURIComponent(tokenMatch[1]);
        }
      }

      if (!qrToken) {
        console.error("❌ No token found in QR code");
        throw new Error("Invalid QR code - no token found");
      }

      console.log("🔑 Extracted token:", qrToken.substring(0, 10) + "...");

      // Validate QR token
      console.log("🌐 Calling API to validate token...");
      const response = await authAPI.validateQRToken(
        qrToken,
        "mobile",
        "Mobile Device"
      );

      console.log("✅ Token validated successfully");

      const { accessToken, refreshToken, deviceId, userId, encryptionKey } =
        response.data;

      // Store auth
      await storage.setAuth({ accessToken, refreshToken, deviceId, userId });

      // Store encryption key provided by server or initialize local
      if (encryptionKey) {
        await storage.setEncryptionKey(encryptionKey);
      } else {
        await getOrCreateEncryptionKey();
      }

      // Navigate to chat
      console.log("🚀 Navigating to chat screen...");
      router.replace("/chat");
    } catch (error: any) {
      console.error("❌ Login error:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code,
        isNetworkError: error.isNetworkError,
      });

      let errorMessage = "Failed to login";

      if (error.isNetworkError || error.message === "NETWORK_ERROR") {
        errorMessage = `Network error - Cannot connect to backend.\n\nPlease check:\n1. Backend is running\n2. API URL is correct in mobile/src/config/api.ts\n3. Device and computer are on same WiFi\n4. Firewall allows port 5000`;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert("Login Failed", errorMessage, [
        {
          text: "Try Again",
          onPress: () => {
            setScanned(false);
            setLoading(false);
          },
        },
      ]);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Camera permission denied</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.instructionText}>
          Position the QR code within the frame
        </Text>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Logging in...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#3B82F6",
    borderWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: "auto",
    borderRightWidth: 3,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: "auto",
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: "auto",
    left: "auto",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginTop: 30,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 8,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 10,
    fontSize: 14,
  },
  text: {
    color: "#FFFFFF",
    marginTop: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#3B82F6",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
