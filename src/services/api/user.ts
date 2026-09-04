import { API_BASE_URL } from '@/constants/Api';
import { getAuthToken } from '@/services/storage/token';
import type {
  Interest,
  NotificationSettings,
  PrivacySettings,
  SubmitVerificationPayload,
  UpdateProfilePayload,
  UserProfile,
  UserSettingsResponse,
  VerificationStatusResponse,
} from '@/types';

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<UserProfile> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/profile`, { method: 'GET', headers });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch profile');
  }

  return data.data.profile as UserProfile;
}

export async function updateMyProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update profile');
  }

  return data.data.profile as UserProfile;
}

// ─── Interests ───────────────────────────────────────────────────────────────

export async function getAllInterests(): Promise<Interest[]> {
  const response = await fetch(`${API_BASE_URL}/interests`, { method: 'GET' });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to load interests');
  }

  return data.data.interests as Interest[];
}

export async function getMyInterests(): Promise<Interest[]> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/interests/my`, { method: 'GET', headers });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to fetch user interests');
  }

  return data.data.interests as Interest[];
}

export async function selectInterests(interestIds: number[]): Promise<Interest[]> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/interests/select`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ interestIds }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to save interests');
  }

  return data.data.interests as Interest[];
}

// ─── Verification ────────────────────────────────────────────────────────────

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/verification/status`, { method: 'GET', headers });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to load verification status');
  }

  return data.data as VerificationStatusResponse;
}

export async function submitVerificationRequest(payload: SubmitVerificationPayload): Promise<any> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/verification/request`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to submit verification request');
  }

  return data.data;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getUserSettings(): Promise<UserSettingsResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/settings`, { method: 'GET', headers });
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to load settings');
  }

  return data.data as UserSettingsResponse;
}

export async function updateNotificationSettings(payload: Partial<NotificationSettings>): Promise<UserSettingsResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/settings/notifications`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      push_notifications: payload.pushNotifications,
      email_notifications: payload.emailNotifications,
      chat_notifications: payload.chatNotifications,
      community_updates: payload.communityUpdates,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update notification settings');
  }

  return data.data as UserSettingsResponse;
}

export async function updatePrivacySettings(payload: Partial<PrivacySettings>): Promise<UserSettingsResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/settings/privacy`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      privacy_profile_visibility: payload.profileVisibility,
      privacy_allow_messages: payload.allowMessages,
      privacy_show_online_status: payload.showOnlineStatus,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to update privacy settings');
  }

  return data.data as UserSettingsResponse;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/settings/password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to change password');
  }
}
