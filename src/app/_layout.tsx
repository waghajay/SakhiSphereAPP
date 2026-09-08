import { notificationService } from "@/services/notifications";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

// Simple error boundary component (inline to avoid import issues)
import React from "react";
import { Text, View } from "react-native";

class SimpleErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text>Something went wrong</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();

    // Register for push notifications (safe - handles Expo Go)
    notificationService.registerForPushNotifications();

    // Handle notification received
    notificationService.addNotificationReceivedListener((notification) => {
      console.log("Notification received");
    });

    // Handle notification tap
    notificationService.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data?.conversationId) {
        router.push(`/chat/${data.conversationId}` as any);
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <SimpleErrorBoundary>
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
          <Stack.Screen name="chat/[id]" />
        </Stack>
      </SimpleErrorBoundary>
    </SafeAreaProvider>
  );
}
