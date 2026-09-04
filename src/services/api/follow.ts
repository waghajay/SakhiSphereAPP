// src/services/api/follow.ts
import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface FollowUser {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  occupation: string | null;
  isFollowing: boolean;
  followedAt?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  interests?: any[];
}

export async function toggleFollow(
  userId: number,
): Promise<{ following: boolean; followersCount: number; message: string }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
    method: "POST",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to toggle follow");
  }

  return data.data;
}

export async function getFollowers(
  userId: number,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/followers?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch followers");
  }

  return data.data;
}

export async function getFollowing(
  userId: number,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/following?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch following");
  }

  return data.data;
}

export async function getFollowCounts(userId: number) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/follow-counts`,
    {
      method: "GET",
      headers,
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch follow counts");
  }

  return data.data;
}

export async function getMutualConnections(userId: number): Promise<any[]> {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/mutual-connections`,
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
    throw new Error(data.message || "Failed to fetch mutual connections");
  }

  return data.data.connections;
}

export async function checkFollowStatus(userId: number) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/${userId}/follow-status`,
    {
      method: "GET",
      headers,
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to check follow status");
  }

  return data.data;
}

export async function getSuggestedUsers(limit: number = 10) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/users/suggested?limit=${limit}`,
    {
      method: "GET",
      headers,
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch suggestions");
  }

  return data.data.users;
}
