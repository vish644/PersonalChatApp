# Network Troubleshooting Guide

## Issue: Mobile app can't connect to backend

### Quick Checklist

1. ✅ **IP Address is correct** - Check `mobile/src/config/api.ts`
2. ✅ **Backend is running** - Check terminal shows "🚀 Server running on port 5000"
3. ✅ **Same WiFi network** - Phone and computer must be on same network
4. ✅ **Firewall allows port 5000** - Windows Firewall might be blocking
5. ✅ **Expo app reloaded** - Changes require app restart

## Step-by-Step Fix

### 1. Verify Your IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet).

**Current IP:** `192.168.31.40` (already set in config)

### 2. Update Mobile Config

The config file is at: `mobile/src/config/api.ts`

Make sure it has:
```typescript
const DEVICE_IP = "192.168.31.40"; // Your actual IP
```

### 3. Check Backend is Running

In backend terminal, you should see:
```
✅ MongoDB connected
✅ Redis connected
🚀 Server running on port 5000
```

### 4. Test Connection from Phone Browser

On your phone's browser, try:
```
http://192.168.31.40:5000/ping
```

If this works, the network is fine. If not, check firewall.

### 5. Check Windows Firewall

**Allow port 5000:**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. TCP, Specific local ports: `5000`
6. Allow the connection
7. Apply to all profiles
8. Name it "Backend Server"

Or temporarily disable firewall to test.

### 6. Restart Expo App

After changing config:
1. Stop Expo (Ctrl+C in terminal)
2. Clear cache: `npx expo start -c`
3. Reload app on phone (shake → "Reload")

### 7. Check Mobile Logs

In Expo terminal, look for:
```
🔧 API Configuration:
   API URL: http://192.168.31.40:5000/api
   Socket URL: http://192.168.31.40:5000
```

If you see `localhost` instead, the config didn't reload.

### 8. Verify Same Network

- Phone WiFi: Check it's connected to same network as computer
- Computer WiFi: Check network name matches
- If using mobile hotspot: Connect computer to phone's hotspot (or vice versa)

## Common Errors

### "ECONNREFUSED"
- Backend not running
- Wrong IP address
- Firewall blocking

### "ENOTFOUND"
- Wrong IP address
- Network connectivity issue

### "ETIMEDOUT"
- Firewall blocking
- Different networks
- Backend crashed

### "Network Error"
- Check all above steps
- Try restarting both backend and Expo

## Quick Test Script

Add this to test connection:

```typescript
// In mobile app, add this test
import { testConnection } from "./src/utils/connectionTest";

// Call this function to test
testConnection().then(result => {
  console.log(result.message);
});
```

## Still Not Working?

1. **Try different IP**: Sometimes network changes IP. Run `ipconfig` again.
2. **Use ngrok**: For testing, you can use ngrok to create a public URL
3. **Check antivirus**: Some antivirus software blocks ports
4. **Try USB debugging**: Connect phone via USB and use port forwarding

