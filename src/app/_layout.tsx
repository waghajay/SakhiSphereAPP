import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="edit-profile"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="interests" />
          <Stack.Screen name="verification" />
          <Stack.Screen name="settings" />
          <Stack.Screen
            name="create-post"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen
            name="edit-post/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="liked-posts" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="followers/[userId]" />
          <Stack.Screen name="following/[userId]" />
        </Stack>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
