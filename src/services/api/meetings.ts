import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type MeetingRole = "host" | "speaker" | "audience";
export type MeetingStatus = "draft" | "scheduled" | "live" | "ended";

export interface MeetingHost {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

export interface AppMeeting {
  id: number;
  title: string;
  description: string | null;
  channelName: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  isInstant: boolean;
  isLiveStream: boolean;
  maxParticipants: number | null;
  recordingUrl: string | null;
  host: MeetingHost | null;
  group: { id: number; name: string } | null;
  event: { id: number; title: string } | null;
  participantCount: number;
  isHost: boolean;
  myRole: MeetingRole | null;
  canJoin: boolean;
  isLive: boolean;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingParticipant {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
  role: MeetingRole;
  invitedAt: string;
  joinedAt: string | null;
  leftAt: string | null;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  role: MeetingRole;
  expiresAt: number;
  isLiveStream: boolean;
}

export interface CreateMeetingPayload {
  title: string;
  description?: string;
  scheduledAt?: string | null;
  isInstant?: boolean;
  maxParticipants?: number | null;
  isLiveStream?: boolean;
  eventId?: number | null;
  groupId?: number | null;
  inviteUserIds?: number[];
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createMeeting(
  payload: CreateMeetingPayload,
): Promise<AppMeeting> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create meeting");
  }
  return data.data.meeting as AppMeeting;
}

export async function getMeetings(
  options: {
    page?: number;
    limit?: number;
    filter?: "upcoming" | "past" | "hosted" | "invited" | "all";
    groupId?: number;
    eventId?: number;
  } = {},
) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (options.page) params.append("page", options.page.toString());
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.filter) params.append("filter", options.filter);
  if (options.groupId) params.append("groupId", options.groupId.toString());
  if (options.eventId) params.append("eventId", options.eventId.toString());

  const response = await fetch(
    `${API_BASE_URL}/meetings?${params.toString()}`,
    {
      method: "GET",
      headers,
    },
  );
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch meetings");
  }
  return data.data as { meetings: AppMeeting[]; pagination: any };
}

export async function getMeeting(meetingId: number): Promise<AppMeeting> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch meeting");
  }
  return data.data.meeting as AppMeeting;
}

export async function updateMeeting(
  meetingId: number,
  payload: Partial<CreateMeetingPayload>,
): Promise<AppMeeting> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update meeting");
  }
  return data.data.meeting as AppMeeting;
}

export async function deleteMeeting(meetingId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete meeting");
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

export async function startMeeting(meetingId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/start`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to start meeting");
  }
}

export async function endMeeting(meetingId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/end`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to end meeting");
  }
}

export async function getAgoraToken(
  meetingId: number,
): Promise<AgoraTokenResponse> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/token`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to get Agora token");
  }
  return data.data as AgoraTokenResponse;
}

export async function joinMeetingApi(meetingId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/join`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to join meeting");
  }
}

export async function leaveMeetingApi(meetingId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/leave`, {
    method: "POST",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to leave meeting");
  }
}

export async function getParticipants(meetingId: number, page = 1, limit = 50) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/meetings/${meetingId}/participants?page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch participants");
  }
  return data.data as { participants: MeetingParticipant[]; pagination: any };
}

export async function inviteUsers(
  meetingId: number,
  userIds: number[],
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/meetings/${meetingId}/invite`, {
    method: "POST",
    headers,
    body: JSON.stringify({ userIds }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to invite users");
  }
}
