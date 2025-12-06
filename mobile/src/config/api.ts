// API Configuration
// IMPORTANT: For physical devices, you MUST update these URLs with your computer's IP address
// 
// To find your IP address:
// - Windows: Run `ipconfig` in CMD, look for "IPv4 Address" (usually 192.168.x.x)
// - Mac/Linux: Run `ifconfig` or `ip addr`, look for inet address
// 
// Example: If your computer's IP is 192.168.1.100, use:
// - API_BASE_URL: "http://192.168.1.100:5000/api"
// - SOCKET_URL: "http://192.168.1.100:5000"

// For emulator/simulator, localhost works fine
// For physical device, replace with your computer's IP
const getApiUrl = () => {
  // Check if we're in development mode
  if (__DEV__) {
    // IMPORTANT: Update this with your computer's IP address for physical devices!
    // For Android emulator, use: "10.0.2.2"
    // For iOS simulator, use: "localhost"
    // For physical device, use your computer's IP (e.g., "192.168.1.100")
    
    // Your computer's IP address (update this if it changes)
    const DEVICE_IP = "192.168.31.40";
    
    return `http://${DEVICE_IP}:5000/api`;
  }
  // Production - use your deployed backend URL
  return "https://your-backend-url.com/api";
};

const getSocketUrl = () => {
  if (__DEV__) {
    // Your computer's IP address (must match DEVICE_IP above)
    const DEVICE_IP = "192.168.31.40";
    return `http://${DEVICE_IP}:5000`;
  }
  return "https://your-backend-url.com";
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

// Log the URLs for debugging
console.log("🔧 API Configuration:");
console.log("   API URL:", API_BASE_URL);
console.log("   Socket URL:", SOCKET_URL);
console.log("   Device:", __DEV__ ? "Development" : "Production");

