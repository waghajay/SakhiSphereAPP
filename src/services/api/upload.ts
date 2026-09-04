import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
}

export interface UploadBase64Payload {
  base64: string;
  mimeType: string;
  folder?: string;
}

/**
 * Uploads a base64 encoded image to Cloudinary via backend.
 * POST /api/upload/base64
 */
export async function uploadBase64Image(
  base64: string,
  mimeType: string,
  folder?: string,
): Promise<UploadResult> {
  const token = await getAuthToken();

  const payload: UploadBase64Payload = {
    base64,
    mimeType,
    folder,
  };

  const response = await fetch(`${API_BASE_URL}/upload/base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload image");
  }

  return data.data as UploadResult;
}

/**
 * Uploads a base64 encoded video to Cloudinary via backend.
 * POST /api/upload/base64
 */
export async function uploadBase64Video(
  base64: string,
  mimeType: string,
  folder?: string,
): Promise<UploadResult> {
  const token = await getAuthToken();

  const payload: UploadBase64Payload = {
    base64,
    mimeType,
    folder,
  };

  const response = await fetch(`${API_BASE_URL}/upload/base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload video");
  }

  return data.data as UploadResult;
}

/**
 * Deletes a file from Cloudinary.
 * DELETE /api/upload/:publicId
 */
export async function deleteFile(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<void> {
  const token = await getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/upload/${publicId}?resourceType=${resourceType}`,
    {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to delete file");
  }
}

/**
 * Uploads an image file using FormData.
 * POST /api/upload/image
 */
export async function uploadImageFile(
  fileUri: string,
  folder?: string,
): Promise<UploadResult> {
  const token = await getAuthToken();

  const formData = new FormData();
  const fileName = fileUri.split("/").pop() || "image.jpg";
  const fileType = fileName.endsWith(".png")
    ? "image/png"
    : fileName.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";

  formData.append("image", {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as any);

  if (folder) {
    formData.append("folder", folder);
  }

  const response = await fetch(`${API_BASE_URL}/upload/image`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload image");
  }

  return data.data as UploadResult;
}

/**
 * Uploads a video file using FormData.
 * POST /api/upload/video
 */
export async function uploadVideoFile(
  fileUri: string,
  folder?: string,
): Promise<UploadResult> {
  const token = await getAuthToken();

  const formData = new FormData();
  const fileName = fileUri.split("/").pop() || "video.mp4";
  const fileType = fileName.endsWith(".webm") ? "video/webm" : "video/mp4";

  formData.append("video", {
    uri: fileUri,
    name: fileName,
    type: fileType,
  } as any);

  if (folder) {
    formData.append("folder", folder);
  }

  const response = await fetch(`${API_BASE_URL}/upload/video`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload video");
  }

  return data.data as UploadResult;
}
