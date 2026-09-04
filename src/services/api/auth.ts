import { API_BASE_URL } from "@/constants/Api";
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  User,
} from "@/types";

/**
 * Register a new user and initiate OTP verification.
 * POST /api/auth/register
 */
export async function register(
  payload: RegisterPayload,
): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Registration failed");
  }

  return data.data as RegisterResult;
}

/**
 * Verify 6-digit OTP code and retrieve access token.
 * POST /api/auth/verify-otp
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Invalid or expired OTP code");
  }

  return data.data as AuthResponse;
}

/**
 * Resend OTP code to user's email.
 * POST /api/auth/send-otp
 */
export async function sendOtp(
  email: string,
  purpose: string = "registration",
): Promise<RegisterResult> {
  const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, purpose }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to send OTP code");
  }

  return data.data as RegisterResult;
}

/**
 * Log in an existing user.
 * POST /api/auth/login
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Login failed");
  }

  return data.data as AuthResponse;
}

/**
 * Get current user profile.
 * GET /api/auth/me
 */
export async function getMe(token: string): Promise<User> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("TOKEN_INVALID");
      }
      throw new Error(data.message || "Failed to fetch user profile");
    }

    return data.data.user as User;
  } catch (error: any) {
    if (error.message === "TOKEN_INVALID") {
      throw error;
    }
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to validate session");
  }
}
