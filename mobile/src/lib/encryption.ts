import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";

// Use AES-256-CBC via CryptoJS for cross-platform compatibility
// Key: hex string (64 hex chars = 32 bytes). IV: 16 bytes (32 hex chars)

// Helper: Convert hex string to CryptoJS WordArray
function hexToWordArray(hex: string) {
  return CryptoJS.enc.Hex.parse(hex);
}

// Helper: convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

// Helper: base64 -> Uint8Array (works in browser and Node/React Native with Buffer)
function base64ToUint8Array(b64: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const str = atob(b64);
    return Uint8Array.from(str, (c) => c.charCodeAt(0));
  }
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return new Uint8Array(buf);
  }
  // Fallback: try globalThis.Buffer
  if ((globalThis as any).Buffer) {
    const buf = (globalThis as any).Buffer.from(b64, "base64");
    return new Uint8Array(buf);
  }
  throw new Error("No base64 decoder available");
}

// Fallback: XOR decryption when data was encoded with base64 (legacy)
function decryptXORBase64(encryptedBase64: string, keyHex: string): string {
  try {
    const combined = base64ToUint8Array(encryptedBase64);
    const LEGACY_IV = 12;
    const iv = combined.slice(0, LEGACY_IV);
    const encrypted = combined.slice(LEGACY_IV);

    let keyBytes = hexToBytes(keyHex);
    if (keyBytes.length < 32) {
      const padded = new Uint8Array(32);
      for (let i = 0; i < 32; i++) padded[i] = keyBytes[i % keyBytes.length];
      keyBytes = padded;
    } else if (keyBytes.length > 32) {
      keyBytes = keyBytes.slice(0, 32);
    }

    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++)
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];

    if (typeof TextDecoder !== "undefined")
      return new TextDecoder().decode(decrypted);
    // Fallback: convert manually
    let s = "";
    for (let i = 0; i < decrypted.length; i++)
      s += String.fromCharCode(decrypted[i]);
    return s;
  } catch (err) {
    throw new Error("XOR fallback decryption failed");
  }
}

// Helper: Convert Uint8Array to hex
function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++)
    hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

// Generate encryption key (hex string)
export const generateKey = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return bytesToHex(randomBytes);
};

// Encrypt text using AES-256-CBC (returns ivHex:cipherHex)
export const encrypt = async (
  text: string,
  keyHex: string
): Promise<string> => {
  const key = hexToWordArray(keyHex);
  const ivBytes = await Crypto.getRandomBytesAsync(16);
  const ivHex = bytesToHex(ivBytes);
  const iv = hexToWordArray(ivHex);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return ivHex + ":" + cipherHex;
};

// Decrypt text (ivHex:cipherHex)
export const decrypt = async (
  encryptedData: string,
  keyHex: string
): Promise<string> => {
  try {
    if (!encryptedData) throw new Error("No encrypted data provided");

    let data = encryptedData.trim();
    if (
      (data.startsWith('"') && data.endsWith('"')) ||
      (data.startsWith("'") && data.endsWith("'"))
    ) {
      data = data.slice(1, -1);
    }

    if (data.startsWith("{")) {
      try {
        const obj = JSON.parse(data);
        if (typeof obj === "object" && obj !== null) {
          if (typeof obj.encryptedContent === "string")
            data = obj.encryptedContent;
          else if (typeof obj.cipher === "string" && typeof obj.iv === "string")
            data = `${obj.iv}:${obj.cipher}`;
          else if (
            typeof obj.ciphertext === "string" &&
            typeof obj.iv === "string"
          )
            data = `${obj.iv}:${obj.ciphertext}`;
          else if (
            typeof obj.cipher === "string" &&
            typeof obj.iv === "string" &&
            typeof obj.tag === "string"
          )
            data = `${obj.iv}:${obj.tag}:${obj.cipher}`;
        }
      } catch (jsonErr) {
        // ignore
      }
    }

    // normalize base64url to base64
    const maybeBase64 = data.replace(/\s+/g, "");
    if (/^[A-Za-z0-9_-]+$/.test(maybeBase64) && !/[:]/.test(maybeBase64)) {
      data = maybeBase64.replace(/-/g, "+").replace(/_/g, "/");
      while (data.length % 4 !== 0) data += "=";
    }

    // Try AES-CBC (iv:cipher)
    if (data.includes(":")) {
      const parts = data.split(":");
      if (parts.length === 2) {
        const [ivHex, cipherHex] = parts;
        const key = hexToWordArray(keyHex);
        const iv = hexToWordArray(ivHex);

        const cipherParams = CryptoJS.lib.CipherParams.create({
          ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
        });

        const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
          iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7,
        });

        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (text) return text;
      }
    }

    // Try AES-GCM if present (iv:tag:cipher) via global crypto.subtle
    try {
      if (data.includes(":")) {
        const parts = data.split(":");
        if (parts.length === 3) {
          const [ivHex, tagHex, cipherHex] = parts;
          const iv = hexToBytes(ivHex);
          const tag = hexToBytes(tagHex);
          const cipher = hexToBytes(cipherHex);

          const cipherWithTag = new Uint8Array(cipher.length + tag.length);
          cipherWithTag.set(cipher, 0);
          cipherWithTag.set(tag, cipher.length);

          const keyBytes = hexToBytes(keyHex);
          const subtle = (globalThis as any).crypto?.subtle;
          if (subtle) {
            const cryptoKey = await subtle.importKey(
              "raw",
              keyBytes,
              { name: "AES-GCM" },
              false,
              ["decrypt"]
            );
            const decrypted = await subtle.decrypt(
              { name: "AES-GCM", iv },
              cryptoKey,
              cipherWithTag
            );
            return new TextDecoder().decode(decrypted);
          }
        }
      }
    } catch (gcmErr) {
      // ignore and continue
    }

    // Fallback XOR+base64
    if (/^[A-Za-z0-9+/=]+$/.test(data)) {
      return decryptXORBase64(data, keyHex);
    }

    console.warn("mobile.decrypt: unknown encrypted format", {
      preview: data.slice(0, 200),
      length: data.length,
    });
    return "[Decryption failed]";
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Decryption failed]";
  }
};

// Get or create encryption key
export const getOrCreateEncryptionKey = async (): Promise<string> => {
  const { storage } = await import("./storage");
  const storedKey = await storage.getEncryptionKey();

  if (storedKey) {
    return storedKey;
  }

  const key = await generateKey();
  await storage.setEncryptionKey(key);
  return key;
};
