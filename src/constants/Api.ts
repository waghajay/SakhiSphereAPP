
function getApiBaseUrl(): string {
  // For production, use the Render.com backend URL
  return "https://sakhisphere-backend.onrender.com/api";
}

export const API_BASE_URL = getApiBaseUrl();
