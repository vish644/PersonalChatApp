// API Configuration
// This mobile app is configured to use the Render backend deployment.
// Change the URL below only if you deploy the backend to a different host.
const getApiUrl = () => {
  return "https://personalchatapp-1.onrender.com/api";
};

const getSocketUrl = () => {
  return "https://personalchatapp-1.onrender.com";
};

export const API_BASE_URL = getApiUrl();
export const SOCKET_URL = getSocketUrl();

// Log the URLs for debugging
console.log("🔧 API Configuration:");
console.log("   API URL:", API_BASE_URL);
console.log("   Socket URL:", SOCKET_URL);
console.log("   Device:", __DEV__ ? "Development" : "Production");
