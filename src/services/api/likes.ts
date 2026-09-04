import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface LikeResponse {
  liked: boolean;
  likesCount: number;
  message: string;
}

export async function toggleLike(postId: number): Promise<LikeResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
    method: "POST",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to toggle like");
  }

  return data.data as LikeResponse;
}

export async function getPostLikes(
  postId: number,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}/likes?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch likes");
  }

  return data.data;
}

export async function getUserLikedPosts(
  userId: number,
  page: number = 1,
  limit: number = 10,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/liked-posts?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch liked posts");
  }

  return data.data;
}

export async function checkLikeStatus(postId: number): Promise<LikeResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/like-status`, {
    method: "GET",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to check like status");
  }

  return data.data as LikeResponse;
}
