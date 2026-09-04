// src/services/api/search.ts
import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/search/users?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to search users");
  }

  return data.data;
}

export async function searchPosts(
  query: string,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/search/posts?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to search posts");
  }

  return data.data;
}
