# Quick Start Guide

## Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed
- ✅ MongoDB running (local or MongoDB Atlas account)
- ✅ Redis running (local or Redis Cloud account)
- ✅ For mobile: Expo Go app installed on your phone

## Step-by-Step Setup

### 1. Start MongoDB and Redis

**Local MongoDB:**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Linux
sudo systemctl start mongod

# On Windows
# Start MongoDB service from Services panel
```

**Local Redis:**
```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo systemctl start redis

# On Windows
# Download and run Redis from https://redis.io/download
```

**Or use cloud services:**
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Redis Cloud: https://redis.com/try-free/

### 2. Backend Setup (Terminal 1)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB and Redis URIs
npm start
```

Backend should be running on `http://localhost:5000`

### 3. Web App Setup (Terminal 2)

```bash
cd web
npm install
# Create .env.local (see web/.env.local.example)
npm run dev
```

Web app should be running on `http://localhost:3000`

### 4. Mobile App Setup (Terminal 3)

```bash
cd mobile
npm install
# Update API URLs in mobile/src/lib/api.ts and mobile/src/lib/socket.ts
# For physical device, use your computer's IP: http://192.168.x.x:5000
npm start
```

Scan QR code with Expo Go app or press `i` for iOS / `a` for Android emulator.

## Testing the App

1. **Register on Web:**
   - Go to http://localhost:3000
   - Click "Sign up"
   - Create an account

2. **Login on Mobile:**
   - On Web, click "Login on Mobile" button
   - Open Mobile app
   - Scan the QR code
   - You're logged in!

3. **Send Messages:**
   - Type a message on Web
   - See it appear on Mobile (and vice versa)

4. **Test Offline:**
   - Turn off WiFi on one device
   - Send messages (they queue locally)
   - Turn WiFi back on
   - Messages sync automatically

5. **Test Backup:**
   - Click Menu → Export Backup (on Web or Mobile)
   - Save the JSON file
   - Click Menu → Import Backup
   - Select the file
   - Messages are restored!

## Troubleshooting

**Backend won't start:**
- Check MongoDB: `mongosh` or check MongoDB Atlas dashboard
- Check Redis: `redis-cli ping` (should return PONG)
- Check `.env` file has correct values

**Web app shows connection error:**
- Verify backend is running on port 5000
- Check browser console for errors
- Verify `NEXT_PUBLIC_API_URL` in `.env.local`

**Mobile app can't connect:**
- For physical device: Update API URLs to use your computer's IP address
- Example: `http://192.168.1.100:5000` instead of `localhost:5000`
- Ensure phone and computer are on same WiFi network
- Check Expo Go is connected

**QR code login fails:**
- QR code expires in 5 minutes - generate a new one
- Check Redis is running (QR tokens stored in Redis)
- Ensure camera permission is granted on mobile

## Common Issues

**"Cannot connect to backend"**
- Backend not running? Check Terminal 1
- Wrong port? Check backend/.env PORT value
- Firewall blocking? Check port 5000 is open

**"MongoDB connection failed"**
- MongoDB not running? Start it
- Wrong connection string? Check MONGODB_URI in backend/.env
- Network issue? Check MongoDB Atlas IP whitelist

**"Redis connection failed"**
- Redis not running? Start it
- Wrong connection string? Check REDIS_URI in backend/.env

**Messages not syncing:**
- Check Socket.io connection in browser console
- Verify tokens are valid (check for 401 errors)
- Ensure both devices are online

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Customize the UI/UX to your liking
- Add more features (file attachments, reactions, etc.)
- Deploy to production (Vercel for Web, Expo for Mobile)

## Production Deployment Notes

Before deploying to production:

1. **Change all secrets:**
   - JWT_SECRET and JWT_REFRESH_SECRET in backend/.env
   - Use strong, random strings

2. **Update CORS origins:**
   - Set CORS_ORIGIN to your production domain
   - Update NEXT_PUBLIC_API_URL in web/.env.local

3. **Use production databases:**
   - MongoDB Atlas (free tier available)
   - Redis Cloud (free tier available)

4. **Environment variables:**
   - Never commit .env files
   - Use environment variables in your hosting platform

5. **Mobile app:**
   - Update API URLs for production
   - Build with EAS Build for app stores
   - Configure deep linking for QR login

