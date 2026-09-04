/**
 * SakhiSphere — Global TypeScript Types
 */

// ─── Auth & User ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  occupation?: string | null;
  is_email_verified?: boolean;
  is_verified?: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterResult {
  email: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// ─── Interests ───────────────────────────────────────────────────────────────

export interface Interest {
  id: number;
  name: string;
  category: string;
  icon: string | null;
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface UserProfile extends User {
  interests: Interest[];
  privacy: PrivacySettings;
  is_verified?: boolean;
  avatarUrl?: string | null;
  avatar_url?: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  avatar_url?: string;
}

// ─── Verification ────────────────────────────────────────────────────────────

export interface VerificationRequest {
  id: number;
  status: "pending" | "approved" | "rejected";
  verification_type: "id_proof" | "student_id" | "work_id" | "social_profile";
  document_note: string | null;
  document_url: string | null;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface VerificationStatusResponse {
  isVerified: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  latestRequest: VerificationRequest | null;
}

export interface SubmitVerificationPayload {
  verification_type: "id_proof" | "student_id" | "work_id" | "social_profile";
  document_note?: string;
  document_base64?: string;
  document_mime_type?: string;
  document_file_name?: string;
}

// ─── Settings & Privacy ──────────────────────────────────────────────────────

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  chatNotifications: boolean;
  communityUpdates: boolean;
}

export interface PrivacySettings {
  profileVisibility: "public" | "members_only" | "connections_only";
  allowMessages: "all_members" | "connections_only";
  showOnlineStatus: boolean;
}

export interface UserSettingsResponse {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

// ─── Posts ───────────────────────────────────────────────────────────────────

export interface Post {
  id: number;
  content: string;
  mediaUrls: string[];
  mediaTypes: ("image" | "video")[];
  mediaThumbnails?: string[];
  visibility: "public" | "members_only" | "connections_only";
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  };
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export interface CreatePostPayload {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: ("image" | "video")[];
  visibility?: "public" | "members_only" | "connections_only";
}

export interface FeedResponse {
  posts: Post[];
  feedType?: string;
  feedExplanation?: string;
  hasFollows?: boolean;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    isVerified: boolean;
    avatarUrl: string | null;
  };
  repliesCount: number;
}

export interface CreateCommentPayload {
  content: string;
  parentId?: number;
}

// ─── Follow & Social ─────────────────────────────────────────────────────────

export interface MutualConnection {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface PostAuthor {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
  bio?: string | null;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
