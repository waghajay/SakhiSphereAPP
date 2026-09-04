import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";
import * as FileSystem from "expo-file-system/legacy";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  format?: string;
  resourceType?: string;
}

/**
 * Uploads a file to Cloudinary via backend using Blob.
 */
export async function uploadToCloudinary(
  fileUri: string,
  fileType: "image" | "video",
  mimeType: string,
  folder: string = "sakhisphere/posts",
): Promise<CloudinaryUploadResult> {
  const token = await getAuthToken();

  console.log(`Uploading ${fileType}: ${fileUri}`);

  try {
    // Read file as base64 (but smaller chunks for video)
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log(`File size: ${(base64.length / (1024 * 1024)).toFixed(2)}MB`);

    // For large files, use chunked upload
    if (base64.length > 10 * 1024 * 1024) {
      // > 10MB
      return await uploadLargeFile(base64, mimeType, fileType, folder, token);
    }

    // For smaller files, use JSON
    const payload = {
      base64,
      mimeType,
      folder,
      fileName: `upload_${Date.now()}.${mimeType.split("/")[1]}`,
    };

    const endpoint =
      fileType === "image"
        ? `${API_BASE_URL}/upload/base64`
        : `${API_BASE_URL}/upload/base64`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || `Failed to upload ${fileType}`);
    }

    return data.data as CloudinaryUploadResult;
  } catch (error) {
    console.error(`Upload error:`, error);
    throw error;
  }
}

/**
 * Uploads large files in chunks.
 */
async function uploadLargeFile(
  base64: string,
  mimeType: string,
  fileType: "image" | "video",
  folder: string,
  token: string | null,
): Promise<CloudinaryUploadResult> {
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const chunks: string[] = [];

  // Split base64 into chunks
  for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
    chunks.push(base64.substring(i, i + CHUNK_SIZE));
  }

  console.log(`Uploading ${chunks.length} chunks`);

  // Upload all chunks
  const payload = {
    chunks,
    mimeType,
    folder,
    fileName: `upload_${Date.now()}.${mimeType.split("/")[1]}`,
    fileType,
  };

  const endpoint = `${API_BASE_URL}/upload/chunked`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to upload file");
  }

  return data.data as CloudinaryUploadResult;
}

/**
 * Uploads multiple files.
 */
export async function uploadMultipleToCloudinary(
  files: { uri: string; type: "image" | "video"; mimeType: string }[],
  folder: string = "sakhisphere/posts",
): Promise<CloudinaryUploadResult[]> {
  const results: CloudinaryUploadResult[] = [];

  for (const file of files) {
    try {
      const result = await uploadToCloudinary(
        file.uri,
        file.type,
        file.mimeType,
        folder,
      );
      results.push(result);
    } catch (error) {
      console.error(`Failed to upload ${file.type}:`, error);
    }
  }

  return results;
}
