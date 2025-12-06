# Mobile App Debugging Guide

## Viewing Logs

### Expo Go / Development Build

1. **Metro Bundler Terminal**: Logs appear in the terminal where you ran `npm start`
2. **React Native Debugger**: 
   - Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
   - Select "Debug" or "Open Debugger"
   - Open Chrome DevTools at `http://localhost:8081/debugger-ui`
3. **Expo Dev Tools**: Press `j` in the Metro bundler terminal to open Dev Tools

### Physical Device

1. **USB Debugging (Android)**:
   ```bash
   adb logcat | grep -i "react"
   ```

2. **iOS Simulator**:
   - Logs appear in Xcode Console
   - Or use: `xcrun simctl spawn booted log stream --level=debug`

3. **React Native Debugger**:
   - Shake device → "Debug" → Opens Chrome DevTools
   - Check Console tab for `console.log` output

## Common Network Issues

### Issue: "Network Error" or "Connection Refused"

**Cause**: Mobile app is trying to connect to `localhost`, which doesn't work on physical devices.

**Solution**:
1. Find your computer's IP address:
   - **Windows**: Run `ipconfig` → Look for "IPv4 Address" (e.g., `192.168.1.100`)
   - **Mac/Linux**: Run `ifconfig` or `ip addr` → Look for `inet` address

2. Update `mobile/src/config/api.ts`:
   ```typescript
   const getApiUrl = () => {
     if (__DEV__) {
       // Replace with YOUR computer's IP address
       return "http://192.168.1.100:5000/api"; // ← UPDATE THIS
     }
     return "https://your-backend-url.com/api";
   };
   ```

3. Ensure your computer and phone are on the **same WiFi network**

4. Check firewall settings - port 5000 must be open

### Issue: "Invalid QR code" or "No token found"

**Cause**: QR code URL format might not be parsed correctly.

**Solution**: The code now handles both standard URLs and custom protocol URLs. Check the logs to see what was scanned:
```
📱 QR Code scanned: personalchat://qr-login?token=abc123
🔑 Extracted token: abc123...
```

### Issue: "WRONGPASS" or Authentication Errors

**Cause**: Backend Redis connection issue or token expired.

**Solution**: 
- Check backend logs
- Ensure Redis is running
- Generate a new QR code (they expire in 5 minutes)

## Testing Steps

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   # Should see: "✅ MongoDB connected" and "✅ Redis connected"
   ```

2. **Start Mobile App**:
   ```bash
   cd mobile
   npm start
   ```

3. **Check Logs**:
   - Look for: `🔧 API Configuration:` in mobile logs
   - Verify API URL is correct (not localhost if on physical device)

4. **Test QR Login**:
   - Open web app → Click "Login on Mobile"
   - Scan QR code with mobile app
   - Check logs for:
     - `📱 QR Code scanned: ...`
     - `🔑 Extracted token: ...`
     - `🌐 Calling API to validate token...`
     - `✅ Token validated successfully`

## Debugging Checklist

- [ ] Backend is running and accessible
- [ ] MongoDB connected (check backend logs)
- [ ] Redis connected (check backend logs)
- [ ] Mobile app API URL points to correct IP (not localhost)
- [ ] Computer and phone on same WiFi network
- [ ] Firewall allows port 5000
- [ ] QR code is fresh (not expired - 5 min limit)
- [ ] Check mobile logs for error messages
- [ ] Check backend logs for incoming requests

## Quick Fixes

**Can't see logs?**
- Enable remote debugging: Shake device → "Debug"
- Check Metro bundler terminal
- Use `console.log()` statements (they appear in logs)

**Network still not working?**
- Try using your computer's IP address in browser: `http://YOUR_IP:5000/ping`
- If that works, use same IP in mobile config
- If that doesn't work, check firewall/antivirus

**QR code not scanning?**
- Ensure camera permission is granted
- Check QR code is in focus
- Try generating a new QR code (old ones expire)

