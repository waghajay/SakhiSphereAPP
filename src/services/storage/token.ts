import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { User } from '@/types';

const TOKEN_KEY = 'sakhisphere_auth_token';
const USER_KEY = 'sakhisphere_user_data';

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(TOKEN_KEY);
    }
    return null;
  }
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}

export async function saveUserData(user: User): Promise<void> {
  const data = JSON.stringify(user);
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(USER_KEY, data);
    }
  } else {
    await SecureStore.setItemAsync(USER_KEY, data);
  }
}

export async function getUserData(): Promise<User | null> {
  let data: string | null = null;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      data = window.localStorage.getItem(USER_KEY);
    }
  } else {
    data = await SecureStore.getItemAsync(USER_KEY);
  }
  return data ? JSON.parse(data) : null;
}
