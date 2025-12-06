const CryptoJS = require("crypto-js");
const crypto = require("crypto");

// Key must be 64-char hex (32 bytes), IV = 32 hex chars (16 bytes)
function bytesToHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function hexToWordArray(hex) {
  return CryptoJS.enc.Hex.parse(hex);
}

// Encrypt text with AES-256-CBC => returns "ivHex:cipherHex"
exports.encrypt = (text, keyHex) => {
  try {
    const iv = crypto.randomBytes(16);
    const ivHex = bytesToHex(iv);
    const keyWA = hexToWordArray(keyHex);

    const encrypted = CryptoJS.AES.encrypt(text, keyWA, {
      iv: hexToWordArray(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
    return `${ivHex}:${cipherHex}`;
  } catch (err) {
    console.error("AES Encryption error:", err);
    throw new Error("Encryption failed");
  }
};

// Decrypt AES-256-CBC => input must be "ivHex:cipherHex"
exports.decrypt = (encryptedData, keyHex) => {
  try {
    if (!encryptedData || typeof encryptedData !== "string")
      return encryptedData;

    // Split first ":" as IV and rest as ciphertext (some ciphers include ":" inside them)
    const [ivHex, ...cipherRest] = encryptedData.split(":");
    if (!ivHex || cipherRest.length === 0) return encryptedData;

    const cipherHex = cipherRest.join(":");
    const keyWA = CryptoJS.enc.Hex.parse(keyHex);
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWA, {
      iv: CryptoJS.enc.Hex.parse(ivHex),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return decrypted.toString(CryptoJS.enc.Utf8) || encryptedData;
  } catch (err) {
    console.error("AES decrypt error:", err);
    return encryptedData;
  }
};

// Generate 32-byte random hex key
exports.generateDeviceKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Get AES key from password hash (pad/truncate to 64 hex chars)
exports.getEncryptionKey = (passwordHash) => {
  let hex = (passwordHash || "").substring(0, 64);
  if (hex.length < 64) hex = hex.padEnd(64, "0");
  return hex;
};
