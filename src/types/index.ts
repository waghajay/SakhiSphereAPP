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
  otpDev?: string;
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
  status: 'pending' | 'approved' | 'rejected';
  verification_type: 'id_proof' | 'student_id' | 'work_id' | 'social_profile';
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
  verification_type: 'id_proof' | 'student_id' | 'work_id' | 'social_profile';
  document_note?: string;
  document_url?: string;
  autoApprove?: boolean;
}

// ─── Settings & Privacy ──────────────────────────────────────────────────────

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  chatNotifications: boolean;
  communityUpdates: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'members_only' | 'connections_only';
  allowMessages: 'all_members' | 'connections_only';
  showOnlineStatus: boolean;
}

export interface UserSettingsResponse {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
