# Quick Fix for Network Connection

## Your Current Setup
- **IP Address:** `192.168.31.40` ✅ (Already configured)
- **Backend Port:** `5000`

## Immediate Steps to Fix

### 1. Restart Expo with Cache Clear
```bash
cd mobile
npx expo start -c
```
This clears cache and reloads config.

### 2. Check Windows Firewall
**Quick Test:** Temporarily disable Windows Firewall to test if it's blocking.

**Or Allow Port 5000:**
1. Open "Windows Defender Firewall with Advanced Security"
2. Inbound Rules → New Rule
3. Port → TCP → Specific: `5000`
4. Allow connection → All profiles
5. Name: "Backend Server"

### 3. Test Connection from Phone Browser
On your phone, open browser and go to:
```
http://192.168.31.40:5000/ping
```

**Expected:** Should show `{"message":"Backend running"}`

**If it doesn't work:**
- Firewall is blocking (fix step 2)
- Different networks (check WiFi)
- IP changed (run `ipconfig` again)

### 4. Verify Same Network
- **Phone WiFi:** Check network name
- **Computer WiFi:** Check network name
- **Must match!**

### 5. Check Mobile Logs
In Expo terminal, you should see:
```
🔧 API Configuration:
   API URL: http://192.168.31.40:5000/api
```

If you see `localhost`, the config didn't reload. Do step 1 again.

### 6. Reload App on Phone
- Shake phone → "Reload"
- Or press `r` in Expo terminal

## Still Not Working?

### Option A: Use ngrok (Temporary)
```bash
# Install ngrok
npm install -g ngrok

# In backend directory
ngrok http 5000
```

Use the ngrok URL in mobile config (temporary solution).

### Option B: Check IP Again
IP addresses can change. Run:
```bash
ipconfig
```
Update `mobile/src/config/api.ts` if IP changed.

### Option C: Use USB Debugging
Connect phone via USB and use port forwarding (more complex).

