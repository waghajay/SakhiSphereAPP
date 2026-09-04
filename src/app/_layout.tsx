import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth Screens */}
        <Stack.Screen name="(auth)" />

        {/* Main Tabs */}
        <Stack.Screen name="(tabs)" />

        {/* Profile & Settings */}
        <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
        <Stack.Screen name="interests" />
        <Stack.Screen name="verification" />
        <Stack.Screen name="settings" />

        {/* Post Screens */}
        <Stack.Screen name="create-post" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="edit-post/[id]"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="liked-posts" />

        {/* User Screens */}
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="followers/[userId]" />
        <Stack.Screen name="following/[userId]" />
      </Stack>
    </>
  );
}
