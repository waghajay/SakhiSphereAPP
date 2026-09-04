import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
}

export interface UploadBase64Payload {
  base64: string;
  mimeType: string;
  folder?: string;
}

/**
 * Uploads a base64 encoded image with compression.
 */
export async function uploadBase64Image(
  base64: string,
  mimeType: string,
  folder?: string,
): Promise<UploadResult> {
  const token = await getAuthToken();

  const payload: UploadBase64Payload = { base64, mimeType, folder };

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
 * Uploads multiple images.
 */
export async function uploadMultipleImages(
  images: { base64: string; mimeType: string }[],
  folder?: string,
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const image of images) {
    if (image.base64) {
      try {
        const result = await uploadBase64Image(
          image.base64,
          image.mimeType,
          folder,
        );
        results.push(result);
      } catch (error) {
        console.error("Failed to upload image:", error);
        // Continue with other images
      }
    }
  }

  return results;
}

/**
 * Deletes a file from Cloudinary.
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
