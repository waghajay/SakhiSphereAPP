import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  database: string;
  modules: {
    auth: string;
    profile: string;
    interests: string;
    verification: string;
    settings: string;
    posts: string;
    likes: string;
    comments: string;
    follow: string;
    search: string;
    upload: string;
  };
}

export async function checkApiHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
    });
    const data = await response.json();
    return data as HealthStatus;
  } catch (error) {
    console.error("API health check failed:", error);
    return null;
  }
}

export async function checkAuthHealth(): Promise<boolean> {
  try {
    const token = await getAuthToken();
    if (!token) return false;

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("Auth health check failed:", error);
    return false;
  }
}
