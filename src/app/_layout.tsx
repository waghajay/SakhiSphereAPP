import { notificationService } from "@/services/notifications";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync();

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

    notificationService.registerForPushNotifications();

    notificationService.addNotificationReceivedListener((notification) => {
      console.log("Notification received");
    });

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
          {/* Auth + Tabs */}
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />

          {/* Profile / auth-adjacent */}
          <Stack.Screen
            name="edit-profile"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="interests" />
          <Stack.Screen name="verification" />
          <Stack.Screen name="settings" />

          {/* Posts */}
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

          {/* Users + social */}
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="followers/[userId]" />
          <Stack.Screen name="following/[userId]" />

          {/* Chat */}
          <Stack.Screen name="chat/[id]" />

          {/* Groups */}
          <Stack.Screen name="groups/index" />
          <Stack.Screen
            name="groups/create"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="groups/[id]/index" />
          <Stack.Screen name="groups/[id]/members" />
          <Stack.Screen name="groups/[id]/settings" />
          <Stack.Screen name="groups/[id]/discussions" />
          <Stack.Screen name="groups/posts/[postId]" />

          {/* Events */}
          <Stack.Screen name="events/index" />
          <Stack.Screen
            name="events/create"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="events/[id]" />
          <Stack.Screen name="events/my" />
          <Stack.Screen
            name="events/edit/[id]"
            options={{ presentation: "modal" }}
          />

          {/* Meetings */}
          <Stack.Screen name="meetings/index" />
          <Stack.Screen
            name="meetings/create"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="meetings/[id]" />
          <Stack.Screen
            name="meetings/[id]/room"
            options={{ headerShown: false, presentation: "fullScreenModal" }}
          />
        </Stack>
      </SimpleErrorBoundary>
    </SafeAreaProvider>
  );
}
