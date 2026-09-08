import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

export interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow";
  actor: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  };
  content: string;
  postId?: number;
  postPreview?: string;
  createdAt: string;
  isRead: boolean;
}

export async function getNotifications(page: number = 1, limit: number = 20) {
  const token = await getAuthToken();
  const response = await fetch(
    `${API_BASE_URL}/notifications?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch notifications");
  }

  return data.data;
}
