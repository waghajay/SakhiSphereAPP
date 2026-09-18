import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  coverUrl: string | null;
  privacy: "public" | "private" | "invite_only";
  category: string | null;
  memberCount: number;
  postCount: number;
  owner: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  } | null;
  isMember: boolean;
  myRole: "owner" | "admin" | "member" | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
  coverUrl?: string;
  privacy?: "public" | "private" | "invite_only";
  category?: string;
}

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to create group");
  return data.data.group;
}

export async function getGroups(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    filter?: "all" | "my" | "joined";
  } = {},
) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (options.page) params.append("page", options.page.toString());
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.search) params.append("search", options.search);
  if (options.category) params.append("category", options.category);
  if (options.filter) params.append("filter", options.filter);

  const response = await fetch(`${API_BASE_URL}/groups?${params.toString()}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch groups");
  return data.data as { groups: Group[]; pagination: any };
}

export async function getGroup(groupId: number): Promise<Group> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch group");
  return data.data.group;
}

export async function updateGroup(
  groupId: number,
  payload: Partial<CreateGroupPayload>,
): Promise<Group> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to update group");
  return data.data.group;
}

export async function deleteGroup(groupId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to delete group");
}

export async function joinGroup(groupId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/join`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to join group");
}

export async function leaveGroup(groupId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/leave`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to leave group");
}

export async function getGroupMembers(groupId: number, page = 1, limit = 20) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/members?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch members");
  return data.data as { members: GroupMember[]; pagination: any };
}

export async function removeMember(
  groupId: number,
  userId: number,
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/members/${userId}`,
    {
      method: "DELETE",
      headers,
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to remove member");
}

export async function promoteMember(
  groupId: number,
  userId: number,
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/members/${userId}/promote`,
    {
      method: "POST",
      headers,
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to promote member");
}

export async function getCategories(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/groups/categories`);
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch categories");
  return data.data.categories;
}

// Add to the existing file

export interface GroupPost {
  id: number;
  groupId: number;
  group: { id: number; name: string } | null;
  content: string;
  mediaUrls: string[];
  mediaTypes: ("image" | "video")[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  } | null;
}

export interface CreateGroupPostPayload {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: ("image" | "video")[];
}

export async function createGroupPost(
  groupId: number,
  payload: CreateGroupPostPayload,
): Promise<GroupPost> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/${groupId}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to create post");
  return data.data.post;
}

export async function getGroupPosts(groupId: number, page = 1, limit = 10) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/${groupId}/posts?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch posts");
  return data.data as { posts: GroupPost[]; pagination: any };
}

export async function getGroupPost(postId: number): Promise<GroupPost> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/posts/${postId}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch post");
  return data.data.post;
}

export async function updateGroupPost(
  postId: number,
  payload: { content: string },
): Promise<GroupPost> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/posts/${postId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to update post");
  return data.data.post;
}

export async function deleteGroupPost(postId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/posts/${postId}`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to delete post");
}

// Add to existing file

export interface GroupPostComment {
  id: number;
  groupPostId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  } | null;
  repliesCount: number;
}

// Update GroupPost interface to include like counts:
// (Replace existing GroupPost interface)
export interface GroupPost {
  id: number;
  groupId: number;
  group: { id: number; name: string } | null;
  content: string;
  mediaUrls: string[];
  mediaTypes: ("image" | "video")[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  } | null;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

// ============================================
// LIKES & COMMENTS API
// ============================================

export async function toggleGroupPostLike(
  postId: number,
): Promise<{ liked: boolean; likesCount: number }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/posts/${postId}/like`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to like post");
  return data.data;
}

export async function createGroupPostComment(
  postId: number,
  payload: { content: string; parentId?: number },
): Promise<GroupPostComment> {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/posts/${postId}/comments`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to add comment");
  return data.data.comment;
}

export async function getGroupPostComments(
  postId: number,
  page = 1,
  limit = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/posts/${postId}/comments?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch comments");
  return data.data as { comments: GroupPostComment[]; pagination: any };
}

export async function getGroupCommentReplies(
  commentId: number,
  page = 1,
  limit = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/groups/comments/${commentId}/replies?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to fetch replies");
  return data.data as { comments: GroupPostComment[]; pagination: any };
}

export async function updateGroupComment(
  commentId: number,
  content: string,
): Promise<GroupPostComment> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/comments/${commentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ content }),
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to update comment");
  return data.data.comment;
}

export async function deleteGroupComment(commentId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/groups/comments/${commentId}`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success)
    throw new Error(data.message || "Failed to delete comment");
}
