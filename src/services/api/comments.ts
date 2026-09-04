import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";
import type { Comment, CreateCommentPayload } from "@/types";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createComment(
  postId: number,
  payload: CreateCommentPayload,
): Promise<Comment> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to add comment");
  }

  return data.data.comment as Comment;
}

export async function getPostComments(
  postId: number,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/posts/${postId}/comments?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch comments");
  }

  return data.data;
}

export async function getCommentReplies(
  commentId: number,
  page: number = 1,
  limit: number = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/comments/${commentId}/replies?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch replies");
  }

  return data.data;
}

export async function updateComment(
  commentId: number,
  content: string,
): Promise<Comment> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ content }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update comment");
  }

  return data.data.comment as Comment;
}

export async function deleteComment(commentId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
    method: "DELETE",
    headers,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete comment");
  }
}
