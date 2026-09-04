import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * SakhiSphere API Base URL Configuration.
 *
 * Dynamically resolves to:
 * 1. Web -> http://localhost:3000/api
 * 2. Expo Go on physical device -> Host IP from Expo Metro bundler:3000/api
 * 3. Fallback -> http://10.84.105.112:3000/api
 */
function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3000/api`;
  }

  // Fallback to active network IP
  return 'http://10.84.105.112:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();
