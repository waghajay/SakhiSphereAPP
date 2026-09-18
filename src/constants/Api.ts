import Constants from "expo-constants";
import { Platform } from "react-native";

function getApiBaseUrl(): string {
  // For production
  if (process.env.NODE_ENV === "production") {
    return "https://sakhisphere-backend.onrender.com/api";
  }

  // Web
  if (Platform.OS === "web") {
    return "http://localhost:3000/api";
  }

  // Get host IP from Expo
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:3000/api`;
  }

  // Fallback
  return "http://10.134.107.61:3000/api";
}

export const API_BASE_URL = getApiBaseUrl();
