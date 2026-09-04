import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";
import type { CreatePostPayload, FeedResponse, Post } from "@/types";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create post");
  }

  return data.data.post as Post;
}

export async function getFeed(
  page: number = 1,
  limit: number = 10,
  sortBy: "recent" | "popular" | "following" | "interests" = "recent",
): Promise<FeedResponse> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/posts/feed?page=${page}&limit=${limit}&sortBy=${sortBy}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch feed");
  }

  return data.data as FeedResponse;
}

export async function getPost(postId: number): Promise<Post> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
    method: "GET",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch post");
  }

  return data.data.post as Post;
}

export async function updatePost(
  postId: number,
  payload: Partial<CreatePostPayload>,
): Promise<Post> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update post");
  }

  return data.data.post as Post;
}

export async function deletePost(postId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
    method: "DELETE",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete post");
  }
}

export async function getUserPosts(
  userId: number,
  page: number = 1,
  limit: number = 10,
): Promise<FeedResponse> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/posts/user/${userId}?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch user posts");
  }

  return data.data as FeedResponse;
}
