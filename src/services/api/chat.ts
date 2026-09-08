import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ChatUser {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

export interface Conversation {
  id: number;
  isGroup: boolean;
  name: string;
  avatarUrl: string | null;
  otherUser: ChatUser | null;
  lastMessage: {
    id: number;
    content: string;
    messageType: string;
    senderId: number;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  content: string;
  messageType: string;
  mediaUrl: string | null;
  isRead: boolean;
  createdAt: string;
  sender: ChatUser;
}

export async function createOrGetConversation(
  targetUserId: number,
): Promise<Conversation> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ targetUserId }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create conversation");
  }

  return data.data.conversation as Conversation;
}

export async function getUserConversations(
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch conversations");
  }

  return data.data;
}

export async function getConversationMessages(
  conversationId: number,
  page: number = 1,
  limit: number = 50,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch messages");
  }

  return data.data;
}

export async function sendMessage(
  conversationId: number,
  content: string,
  messageType: string = "text",
  mediaUrl?: string,
): Promise<ChatMessage> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ content, messageType, mediaUrl }),
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to send message");
  }

  return data.data.message as ChatMessage;
}

export async function getUnreadCount(): Promise<{ unreadCount: number }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/chat/unread-count`, {
    method: "GET",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch unread count");
  }

  return data.data;
}

export async function deleteMessage(messageId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/chat/messages/${messageId}`, {
    method: "DELETE",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete message");
  }
}
