import type { User } from "@/types";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "sakhisphere_auth_token";
const USER_KEY = "sakhisphere_user_data";
const TOKEN_EXPIRY_KEY = "sakhisphere_token_expiry";

export async function saveAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, token);
      // Set expiry 7 days from now
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 7);
      window.localStorage.setItem(TOKEN_EXPIRY_KEY, expiry.toISOString());
    }
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    // Set expiry 7 days from now
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiry.toISOString());
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem(TOKEN_KEY);
      const expiry = window.localStorage.getItem(TOKEN_EXPIRY_KEY);

      if (token && expiry) {
        // Check if token is expired
        if (new Date(expiry) > new Date()) {
          return token;
        } else {
          // Token expired, clear it
          window.localStorage.removeItem(TOKEN_KEY);
          window.localStorage.removeItem(TOKEN_EXPIRY_KEY);
          return null;
        }
      }
      return token;
    }
    return null;
  }

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);

  if (token && expiry) {
    // Check if token is expired
    if (new Date(expiry) > new Date()) {
      return token;
    } else {
      // Token expired, clear it
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
      return null;
    }
  }

  return token;
}

export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem(TOKEN_EXPIRY_KEY);
    }
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  }
}

export async function saveUserData(user: User): Promise<void> {
  const data = JSON.stringify(user);
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(USER_KEY, data);
    }
  } else {
    await SecureStore.setItemAsync(USER_KEY, data);
  }
}

export async function getUserData(): Promise<User | null> {
  let data: string | null = null;
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      data = window.localStorage.getItem(USER_KEY);
    }
  } else {
    data = await SecureStore.getItemAsync(USER_KEY);
  }
  return data ? JSON.parse(data) : null;
}
