# Personal Chat App

A secure, end-to-end encrypted personal chat application with Web and Mobile clients, built with Next.js, React Native, MongoDB, and Redis.

## Features

- 🔐 **End-to-End Encryption**: Messages are encrypted on the client side before being sent to the server. The server cannot read message content.
- 📱 **Multi-Device Support**: Use the same account on Web and Mobile devices.
- 🔑 **QR Code Login**: Mobile app logs in by scanning a QR code from the Web app (no password typing on mobile).
- 💬 **Real-Time Messaging**: Messages sync in real-time across all devices using Socket.io.
- 📴 **Offline Support**: Messages are queued when offline and sync automatically when connection is restored.
- 💾 **Backup & Restore**: Export your full chat history and import it on another device.
- 🔄 **Auto Token Refresh**: Session tokens automatically refresh every 15 minutes for security.
- 🎨 **Modern UI/UX**: Clean, responsive design with dark mode support.

## Tech Stack

### Backend
- **Node.js** with Express
- **MongoDB** - User accounts, device sessions, encrypted messages
- **Redis** - Temporary QR tokens, session management
- **Socket.io** - Real-time messaging
- **JWT** - Authentication tokens

### Web App
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Socket.io Client** - Real-time communication
- **Web Crypto API** - Client-side encryption

### Mobile App
- **React Native** with Expo
- **TypeScript** - Type safety
- **Expo Router** - Navigation
- **Socket.io Client** - Real-time communication
- **Expo Crypto** - Client-side encryption

## Project Structure

```
Personal_Chat_App/
├── backend/          # Express server
│   ├── src/
│   │   ├── config/   # MongoDB, Redis connections
│   │   ├── models/   # User, Message models
│   │   ├── controllers/  # Auth, Message controllers
│   │   ├── routes/   # API routes
│   │   ├── middlewares/  # Auth middleware
│   │   ├── socket/   # Socket.io handlers
│   │   └── utils/    # JWT utilities
│   └── server.js     # Entry point
├── web/              # Next.js web app
│   └── src/
│       ├── app/      # Next.js pages
│       ├── components/  # React components
│       └── lib/      # API, socket, encryption utilities
├── mobile/           # React Native mobile app
│   ├── app/          # Expo Router pages
│   └── src/
│       ├── screens/  # Screen components
│       └── lib/      # API, socket, encryption utilities
└── shared/           # Shared utilities
    └── utils/        # Encryption utilities
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or cloud)
- Redis (local or cloud)
- For mobile: Expo Go app on your phone or iOS Simulator/Android Emulator

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```env
MONGODB_URI=mongodb://localhost:27017/personal-chat-app
REDIS_URI=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
PORT=5000
CORS_ORIGIN=http://localhost:3000
```

4. Start MongoDB and Redis:
```bash
# MongoDB (if installed locally)
mongod

# Redis (if installed locally)
redis-server
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload
npm run dev
```

The backend will run on `http://localhost:5000`

### Web App Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_MOBILE_APP_URL=personalchat://qr-login
```

4. Start the development server:
```bash
npm run dev
```

The web app will run on `http://localhost:3000`

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update the API URLs in `mobile/src/lib/api.ts` and `mobile/src/lib/socket.ts` to match your backend URL (if different from localhost).

4. Start Expo:
```bash
npm start
```

5. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app
   - Or press `i` for iOS Simulator / `a` for Android Emulator

## How to Use

### 1. Register and Login on Web

1. Open `http://localhost:3000` in your browser
2. Click "Sign up" to create an account
3. Enter your email and password
4. After registration, you'll be automatically logged in and taken to the chat screen

### 2. Login on Mobile with QR Code

1. On the Web app, click "Login on Mobile" button in the chat header
2. A QR code will appear (expires in 5 minutes)
3. Open the Mobile app
4. Tap "Scan QR Code to Login"
5. Grant camera permission if prompted
6. Scan the QR code from the Web app
7. You'll be automatically logged in and taken to the chat screen

### 3. Send and Receive Messages

- **On Web**: Type a message in the input box and press Enter or click Send
- **On Mobile**: Type a message and tap Send
- Messages sent from one device appear instantly on the other device
- Each message shows which device sent it (Web/Mobile) and the time

### 4. Offline → Online Sync

- If a device goes offline, messages are queued locally
- When the connection is restored, messages automatically sync
- The app shows an "Offline" badge when disconnected

### 5. Export Backup

**Web:**
1. Click the "☰ Menu" button in the chat header
2. Select "📥 Export Backup"
3. A JSON file will be downloaded with your chat history

**Mobile:**
1. Tap the "📥" button in the chat header
2. The backup file will be saved to your device's document directory

### 6. Import Backup

**Web:**
1. Click the "☰ Menu" button
2. Select "📤 Import Backup"
3. Choose the backup JSON file
4. Messages will be imported and the page will refresh

**Mobile:**
1. Tap the "📤" button in the chat header
2. Select the backup JSON file from your device
3. Messages will be imported and the chat will refresh

## Security & Privacy

### End-to-End Encryption

- Messages are encrypted on the client using AES-256-GCM encryption
- The encryption key is stored locally on each device (never sent to server)
- The server only stores encrypted message content and cannot decrypt it
- Only devices with the encryption key can read messages

### Session Tokens

- Access tokens expire after 15 minutes
- Tokens are automatically refreshed every 14 minutes
- Refresh tokens expire after 7 days
- QR login tokens are single-use and expire after 5 minutes
- Tokens are stored securely and never displayed in the UI

### Token Refresh Mechanism

The app automatically refreshes access tokens every 14 minutes (before the 15-minute expiry). This happens in the background using:
- **Web**: `useTokenRefresh` hook that calls the refresh endpoint
- **Mobile**: Similar hook that refreshes tokens automatically

If refresh fails, the user is logged out and redirected to the login screen.

## AI Usage

This project was built using AI-enabled development tools (Cursor IDE) for:

- **Boilerplate Generation**: Initial project structure, API routes, database models
- **Component Building**: React components for Web and Mobile apps
- **Code Refactoring**: Optimizing encryption utilities, API clients
- **UI/UX Design**: Chat interface, authentication forms, QR code display
- **Documentation**: README, code comments, type definitions
- **Bug Fixes**: Debugging socket connections, token refresh logic
- **Copy/UX Tweaks**: Error messages, loading states, empty states

AI was used extensively to accelerate development while maintaining code quality and security best practices.

## Development Notes

### Encryption Implementation

The encryption uses:
- **Web**: Web Crypto API (AES-GCM)
- **Mobile**: Expo Crypto with simplified encryption (for demo purposes)

**Note**: For production, consider using a more robust encryption library like `react-native-crypto` or `expo-crypto` with proper AES-GCM implementation.

### Database Schema

**User Collection:**
- email (unique, indexed)
- passwordHash (bcrypt)
- devices[] (array of device objects with deviceId, deviceType, sessionToken)

**Message Collection:**
- userId (indexed)
- encryptedContent (server cannot read)
- senderDeviceId
- senderDeviceType
- timestamp (indexed)
- messageId (unique)

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/qr-token` - Generate QR login token (requires auth)
- `POST /api/auth/qr-validate` - Validate QR token (mobile login)
- `POST /api/auth/logout` - Logout and remove device

**Messages:**
- `POST /api/messages/send` - Send encrypted message
- `GET /api/messages` - Get messages (paginated)
- `GET /api/messages/export` - Export backup
- `POST /api/messages/import` - Import backup

### Socket.io Events

**Client → Server:**
- `message:send` - Send new message
- `sync:request` - Request message sync

**Server → Client:**
- `message:new` - New message received
- `sync:response` - Sync response with messages
- `message:error` - Message error
- `sync:error` - Sync error

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `mongod` or check MongoDB Atlas connection
- Check Redis is running: `redis-server` or check Redis cloud connection
- Verify `.env` file has correct values

### Web app can't connect
- Verify backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Check browser console for CORS errors

### Mobile app can't connect
- Update API URLs in `mobile/src/lib/api.ts` and `mobile/src/lib/socket.ts`
- For physical device, use your computer's IP address instead of localhost
- Check Expo Go app is connected to the same network

### QR code login fails
- Ensure QR code hasn't expired (5 minutes)
- Check mobile app has camera permission
- Verify backend Redis is running (QR tokens stored in Redis)

### Messages not syncing
- Check Socket.io connection in browser console / React Native debugger
- Verify tokens are valid (check Network tab for 401 errors)
- Ensure both devices are online

## License

This project is for educational/demonstration purposes.

## Future Improvements

- [ ] Push notifications for mobile
- [ ] Message search (client-side only, server can't read)
- [ ] File attachments with encryption
- [ ] Group chats
- [ ] Message reactions
- [ ] Read receipts
- [ ] Better encryption key management (Keychain/Keystore)
- [ ] Biometric authentication
- [ ] Message deletion
- [ ] Typing indicators

