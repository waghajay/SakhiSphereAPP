import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type EventRsvpStatus = "going" | "maybe" | "not_going";

export interface EventOrganizer {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
}

export interface AppEvent {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  isVirtual: boolean;
  meetingUrl: string | null;
  capacity: number | null;
  organizer: EventOrganizer | null;
  group: { id: number; name: string } | null;
  goingCount: number;
  myRsvp: EventRsvpStatus | null;
  isOrganizer: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventPayload {
  title: string;
  description?: string;
  coverUrl?: string;
  startAt: string;
  endAt?: string | null;
  location?: string;
  isVirtual?: boolean;
  meetingUrl?: string;
  capacity?: number | null;
  groupId?: number | null;
}

export interface EventAttendee {
  id: number;
  name: string;
  isVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  status: EventRsvpStatus;
  rsvpAt: string;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createEvent(
  payload: CreateEventPayload,
): Promise<AppEvent> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to create event");
  }
  return data.data.event as AppEvent;
}

export async function getEvents(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: "all" | "upcoming" | "past" | "my" | "going" | "group";
    groupId?: number;
  } = {},
) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (options.page) params.append("page", options.page.toString());
  if (options.limit) params.append("limit", options.limit.toString());
  if (options.search) params.append("search", options.search);
  if (options.filter) params.append("filter", options.filter);
  if (options.groupId) params.append("groupId", options.groupId.toString());

  const response = await fetch(`${API_BASE_URL}/events?${params.toString()}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch events");
  }
  return data.data as { events: AppEvent[]; pagination: any };
}

export async function getEvent(eventId: number): Promise<AppEvent> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "GET",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch event");
  }
  return data.data.event as AppEvent;
}

export async function updateEvent(
  eventId: number,
  payload: Partial<CreateEventPayload>,
): Promise<AppEvent> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to update event");
  }
  return data.data.event as AppEvent;
}

export async function deleteEvent(eventId: number): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete event");
  }
}

// ─── RSVP ────────────────────────────────────────────────────────────────────

export async function rsvpEvent(
  eventId: number,
  status: EventRsvpStatus,
): Promise<{ status: EventRsvpStatus; goingCount: number }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ status }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to RSVP");
  }
  return data.data;
}

export async function cancelRsvp(
  eventId: number,
): Promise<{ goingCount: number }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/events/${eventId}/rsvp`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to cancel RSVP");
  }
  return data.data;
}

export async function getEventAttendees(
  eventId: number,
  status: EventRsvpStatus = "going",
  page = 1,
  limit = 20,
) {
  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/events/${eventId}/attendees?status=${status}&page=${page}&limit=${limit}`,
    { method: "GET", headers },
  );
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to fetch attendees");
  }
  return data.data as { attendees: EventAttendee[]; pagination: any };
}
