import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";
import { Platform } from "react-native";

// Dynamic import for notifications
let Notifications: any = null;
let Device: any = null;

try {
  Notifications = require("expo-notifications");
  Device = require("expo-device");

  if (Notifications?.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.log(
    "Push notifications not available in Expo Go - will work in production build",
  );
}

class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async registerForPushNotifications(): Promise<string | null> {
    if (!Notifications || !Device) {
      console.log("Push notifications not available");
      return null;
    }

    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return null;
    }

    try {
      // Android 13+ requires POST_NOTIFICATIONS permission
      if (Platform.OS === "android") {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Permission not granted for notifications");
          return null;
        }
      } else {
        // iOS
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("Permission not granted for notifications");
          return null;
        }
      }

      // Get Expo push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Push token obtained:", token);

      // Register with backend
      await this.registerTokenWithBackend(token);

      return token;
    } catch (error) {
      console.error("Failed to register for push notifications:", error);
      return null;
    }
  }

  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const authToken = await getAuthToken();
      if (!authToken) return;

      const response = await fetch(
        `${API_BASE_URL}/notifications/register-token`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token,
            platform: Platform.OS,
          }),
        },
      );

      if (response.ok) {
        console.log("Push token registered with backend");
      }
    } catch (error) {
      console.error("Failed to register token with backend:", error);
    }
  }

  async sendLocalNotification(title: string, body: string): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: null,
      });
    } catch (error) {
      console.error("Failed to send local notification:", error);
    }
  }

  addNotificationReceivedListener(callback: (notification: any) => void): void {
    if (!Notifications) return;
    try {
      Notifications.addNotificationReceivedListener(callback);
    } catch (error) {}
  }

  addNotificationResponseReceivedListener(
    callback: (response: any) => void,
  ): void {
    if (!Notifications) return;
    try {
      Notifications.addNotificationResponseReceivedListener(callback);
    } catch (error) {}
  }
}

export const notificationService = NotificationService.getInstance();
