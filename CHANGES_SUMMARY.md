# Summary of Encryption & Authentication Fixes

## Issues Resolved

### 1. Mobile Network Error Handling (ChatScreen)

**Problem**: Mobile ChatScreen would crash if the backend server was unreachable when fetching messages.

**Fix**: Wrapped `messageAPI.getAll()` in try/catch block with fallback to offline mode

- Local messages show immediately from storage
- Server message fetch happens in background with error recovery
- Sets offline flag if fetch fails
- Matches web implementation for consistency

**File**: `mobile/src/screens/ChatScreen.tsx`

---

### 2. Server Auth Debug Logging (Middleware)

**Problem**: 401 errors during chat initialization were opaque — no visibility into whether token was invalid, expired, or device session mismatched.

**Fix**: Added targeted console logs to `authenticate` middleware with token/device previews

- Logs token availability (present/missing)
- Logs token validity (valid/expired)
- Logs user existence
- Logs device existence and session token mismatch
- Uses token preview (first 8 + last 4 chars) to avoid exposing secrets in logs

**File**: `backend/src/middlewares/auth.js`

---

### 3. Socket Reconnection After Token Refresh (Mobile)

**Problem**: When access token refreshes, the socket would remain connected with the old token, causing auth failures on subsequent requests.

**Fix**: Updated `useTokenRefresh` hook to disconnect and reconnect socket after successful token refresh

- Fetches new token from server
- Stores new token in AsyncStorage
- Disconnects old socket
- Socket re-connects on next event with new token (lazy reconnect)
- Matches web implementation behavior

**Files**:

- `mobile/src/hooks/useTokenRefresh.ts` (now imports API_BASE_URL from config instead of hardcoding)

---

### 4. Encryption Key Parity Logging

**Problem**: When messages fail to decrypt with "unknown encrypted format" warnings, it's unclear if the issue is:

- Different encryption keys on client vs server
- Key format mismatch (hex encoding)
- Message payload corruption

**Fix**: Added key preview logging to both web and mobile ChatScreen initialization

- Logs first 8 + last 8 hex chars of loaded encryption key
- Makes it easy to compare keys across devices in browser console and mobile logs
- Safe (doesn't expose full key)

**Files**:

- `web/src/components/Chat/ChatScreen.tsx`
- `mobile/src/screens/ChatScreen.tsx`

---

### 5. Debug Endpoint for Auth Diagnostics

**Problem**: No way to remotely check if a user's encryption key is set correctly or if device session is valid without looking at DB.

**Fix**: Added `/auth/debug` endpoint (requires authentication)

- Returns user's encryption key preview (first 8 + last 8 chars)
- Returns full key length (should be 64 for AES-256)
- Returns device ID
- Returns device found status
- Returns session token match status
- Helpful for diagnosing key mismatches and session issues

**Files**:

- `backend/src/controllers/authController.js` (added `getDebugInfo` export)
- `backend/src/routes/authRoutes.js` (added `GET /auth/debug` route)

---

## How to Use These Fixes

### 1. Check Server Logs for Auth Failures

Run backend server in foreground and watch console for debug logs:

```
🔐 Auth: No token provided
🔐 Auth: Invalid/expired token (abc12345...ef12)
🔐 Auth: User not found (userId: xyz...)
🔐 Auth: Device not found (deviceId: abc123...)
🔐 Auth: Token mismatch for device abc123... (token: abc123...ef12, stored: old1234...la56)
```

### 2. Check Encryption Key Parity

**On Web**: Open browser DevTools (F12) → Console, then:

```javascript
localStorage.getItem("encryptionKey");
// Copy the full hex string (should be 64 chars)
```

**On Mobile**: Check Expo logs or add debugging:

```javascript
await AsyncStorage.getItem("encryptionKey");
// Should match web key exactly
```

**Expected output**:

```
🔑 Encryption key loaded (first 8: a1b2c3d4...x1y2z3w4)
```

Both should have identical key values and length (64 hex chars = 32 bytes).

### 3. Use Debug Endpoint

From any authenticated client:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:5000/api/auth/debug
```

Should return:

```json
{
  "userId": "...",
  "email": "user@example.com",
  "encryptionKeyPreview": "a1b2c3d4...x1y2z3w4",
  "encryptionKeyLength": 64,
  "deviceId": "...",
  "deviceFound": true,
  "sessionTokenMatch": true,
  "devicesCount": 1
}
```

---

## Encryption Flow Summary

1. **Registration/Login**: Server generates `encryptionKey` (32 bytes as 64 hex chars) and stores it per-user
2. **Auth Response**: Server returns `encryptionKey` to client
3. **Client Storage**: Client stores key in localStorage (web) or AsyncStorage (mobile)
4. **Message Encryption**: All messages encrypted with AES-256-CBC, format `ivHex:cipherHex` (hex is safe binary encoding)
5. **Key Sharing**: Both devices use the same server-provided key so messages are mutually decryptable
6. **Fallback Decryption**: If new format fails, client tries AES-GCM, then legacy XOR+base64

---

## Testing the Fixes

### Test 1: Network Resilience (Mobile)

1. Start mobile app and navigate to chat
2. Stop backend server
3. Expected: Chat shows local messages, "Offline" badge appears
4. Restart backend server
5. Expected: Messages fetch succeeds, offline badge disappears

### Test 2: Cross-Device Encryption

1. Log in on web with user account
2. Log in on mobile with same account via QR code
3. Both should log same `encryptionKey` (first 8 + last 8 chars match)
4. Send message from web
5. Expected: Message decrypts to plaintext on mobile (not "[Decryption failed]")
6. Send message from mobile
7. Expected: Message decrypts to plaintext on web

### Test 3: Token Refresh (Mobile)

1. Log in on mobile
2. Wait 14 minutes or manually call token refresh
3. Check console logs for "Socket disconnected" and "Socket connected"
4. Send a message while token is refreshing
5. Expected: Socket reconnects with new token and message sends successfully

---

## Files Modified

1. **backend/src/middlewares/auth.js** - Added debug logging
2. **backend/src/controllers/authController.js** - Added getDebugInfo endpoint
3. **backend/src/routes/authRoutes.js** - Added GET /auth/debug route
4. **mobile/src/screens/ChatScreen.tsx** - Added try/catch for message fetch, added key preview logging
5. **mobile/src/hooks/useTokenRefresh.ts** - Added socket reconnection, fixed API_BASE_URL import
6. **web/src/components/Chat/ChatScreen.tsx** - Added key preview logging

---

## Next Steps

If messages still fail to decrypt after these fixes:

1. **Check Key Parity**: Use browser console to verify both devices loaded the same key
2. **Check Auth Debug**: Call `/auth/debug` endpoint to verify device session is valid
3. **Check Server Logs**: Look for auth failures or token mismatches
4. **Provide Sample**: If still failing, provide:
   - One full `encryptedContent` value from logs
   - First 8 + last 8 chars of the encryption key
   - I can try decrypting locally and identify the exact format/encoding issue

---

## Architecture Notes

- **Encryption**: AES-256-CBC (CryptoJS on both web/mobile, Node crypto on backend)
- **Key Format**: 64-char hex string (32 bytes, 256 bits)
- **Message Envelope**: `ivHex:cipherHex` where IV is 32 hex chars (16 bytes)
- **Fallbacks**: AES-GCM `iv:tag:cipher`, legacy XOR+base64
- **Key Sharing**: Server-persisted per-user key, returned on auth, stored on client
- **Auth**: JWT tokens with device session tracking, socket auth via token
