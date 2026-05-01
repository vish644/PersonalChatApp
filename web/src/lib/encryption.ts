import CryptoJS from "crypto-js";

// Use AES-256-CBC via CryptoJS for cross-platform compatibility
// Key: hex string (64 hex chars = 32 bytes). IV: 16 bytes (32 hex chars)

// Helper: Convert hex string to CryptoJS WordArray
function hexToWordArray(hex: string) {
  return CryptoJS.enc.Hex.parse(hex);
}

// Helper: Convert CryptoJS WordArray to hex string
function wordArrayToHex(wordArray: CryptoJS.lib.WordArray) {
  return wordArray.toString(CryptoJS.enc.Hex);
}

// Helper: convert hex string to bytes
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2)
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
}

// Generate a random key (returns hex string)
export const generateKey = async (): Promise<string> => {
  const bytes = (
    typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto
  ).getRandomValues(new Uint8Array(32));
  let hex = "";
  for (let i = 0; i < bytes.length; i++)
    hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
};

// Export/import helpers (no-op for hex key storage used across app)
export const exportKey = async (key: string): Promise<string> => key;
export const importKey = async (keyString: string): Promise<string> =>
  keyString;

// Encrypt plaintext with AES-256-CBC. Returns hex string: ivHex:cipherHex
export const encrypt = async (
  text: string,
  keyHex: string,
): Promise<string> => {
  const key = hexToWordArray(keyHex);
  const ivBytes = (
    typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto
  ).getRandomValues(new Uint8Array(16));
  let ivHex = "";
  for (let i = 0; i < ivBytes.length; i++)
    ivHex += ivBytes[i].toString(16).padStart(2, "0");
  const iv = hexToWordArray(ivHex);

  const encrypted = CryptoJS.AES.encrypt(text, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  return ivHex + ":" + cipherHex;
};

// Fallback: XOR decryption when data was encoded with base64 (legacy)
function decryptXORBase64(encryptedBase64: string, keyHex: string): string {
  try {
    const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
      c.charCodeAt(0),
    );
    const LEGACY_IV = 12; // legacy IV size used by old XOR scheme
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    throw new Error("XOR fallback decryption failed");
  }
}

// Decrypt: try AES-CBC (new), AES-GCM (legacy server), XOR+base64 (old clients)
export const decrypt = async (
  encryptedData: string,
  keyHex: string,
): Promise<string> => {
  try {
    if (!encryptedData) throw new Error("No encrypted data provided");

    // Normalize input: trim, strip surrounding quotes, handle JSON envelopes
    let data = encryptedData.trim();
    if (
      (data.startsWith('"') && data.endsWith('"')) ||
      (data.startsWith("'") && data.endsWith("'"))
    ) {
      // remove surrounding quotes
      data = data.slice(1, -1);
    }

    // If JSON envelope, try to extract common fields
    if (data.startsWith("{")) {
      try {
        const obj = JSON.parse(data);
        // Common envelope shapes: { encryptedContent: "iv:cipher" } or { iv, tag, cipher } or { iv, cipher }
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
        // not JSON, continue
      }
    }

    // Normalize base64url to base64 if needed
    const maybeBase64 = data.replace(/\s+/g, "");
    if (/^[A-Za-z0-9_-]+$/.test(maybeBase64) && !/[:]/.test(maybeBase64)) {
      // base64url -> base64
      data = maybeBase64.replace(/-/g, "+").replace(/_/g, "/");
      while (data.length % 4 !== 0) data += "=";
    }

    // use normalized data for remaining logic
    encryptedData = data;
    // Try AES-CBC (new format: ivHex:cipherHex)
    if (encryptedData.includes(":")) {
      const parts = encryptedData.split(":");
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

        try {
          const text = decrypted.toString(CryptoJS.enc.Utf8);
          if (text) return text;
        } catch (utf8Err) {
          // Malformed UTF-8 means this format/key did not match, fall through to next fallback.
        }
      }
    }

    // If AES-CBC failed above, try older formats below
    // 1) AES-GCM old format (iv:tag:cipher) - attempt WebCrypto decryption
    try {
      if (encryptedData.includes(":")) {
        const parts = encryptedData.split(":");
        if (parts.length === 3) {
          const [ivHex, tagHex, cipherHex] = parts;
          const iv = hexToBytes(ivHex);
          const tag = hexToBytes(tagHex);
          const cipher = hexToBytes(cipherHex);

          // WebCrypto expects ciphertext with tag appended
          const cipherWithTag = new Uint8Array(cipher.length + tag.length);
          cipherWithTag.set(cipher, 0);
          cipherWithTag.set(tag, cipher.length);

          const keyBytes = hexToBytes(keyHex);
          const subtle = (
            typeof crypto !== "undefined" ? crypto : (globalThis as any).crypto
          ).subtle;
          const cryptoKey = await subtle.importKey(
            "raw",
            keyBytes,
            { name: "AES-GCM" },
            false,
            ["decrypt"],
          );

          const decrypted = await subtle.decrypt(
            { name: "AES-GCM", iv },
            cryptoKey,
            cipherWithTag,
          );

          const decoder = new TextDecoder();
          const text = decoder.decode(decrypted);
          if (text) return text;
        }
      }
    } catch (gcmErr) {
      // ignore and continue to next fallback
    }

    // 2) Old XOR+base64 format (mobile/web legacy)
    if (/^[A-Za-z0-9+/=]+$/.test(encryptedData)) {
      return decryptXORBase64(encryptedData, keyHex);
    }

    // Unknown format: log a readable preview and return placeholder
    console.warn("decrypt: unknown encrypted format", {
      preview: encryptedData.slice(0, 200),
      length: encryptedData.length,
    });
    return "[Decryption failed]";
  } catch (error) {
    console.error("Decryption error:", error);
    return "[Decryption failed]";
  }
};

// Get or create encryption key (hex string)
export const getOrCreateEncryptionKey = async (): Promise<string> => {
  const storedKey =
    typeof window !== "undefined"
      ? localStorage.getItem("encryptionKey")
      : null;
  if (storedKey) return storedKey;
  const key = await generateKey();
  if (typeof window !== "undefined") localStorage.setItem("encryptionKey", key);
  return key;
};
