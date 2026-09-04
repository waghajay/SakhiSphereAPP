import { API_BASE_URL } from "@/constants/Api";
import { getAuthToken } from "@/services/storage/token";

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  format?: string;
}

export async function uploadToCloudinary(
  fileUri: string,
  fileType: "image" | "video",
  mimeType: string,
  folder: string = "sakhisphere/posts",
): Promise<CloudinaryUploadResult> {
  const token = await getAuthToken();

  console.log(`Uploading ${fileType}: ${fileUri}`);
  console.log(`Mime type: ${mimeType}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const endpoint = `${API_BASE_URL}/upload/${fileType}`;

    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    // Set timeout to 5 minutes for large files
    xhr.timeout = 300000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        console.log(`Upload progress: ${percentComplete.toFixed(2)}%`);
      }
    };

    xhr.onload = () => {
      console.log(`Upload response status: ${xhr.status}`);
      console.log(`Upload response: ${xhr.responseText}`);

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.success && data.data && data.data.url) {
            console.log("✅ Upload successful:", data.data);
            resolve(data.data as CloudinaryUploadResult);
          } else {
            reject(
              new Error(data.message || "Upload failed - no URL returned"),
            );
          }
        } catch (error) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          reject(
            new Error(
              data.message || `Upload failed with status ${xhr.status}`,
            ),
          );
        } catch (error) {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out"));
    };

    // Create FormData
    const formData = new FormData();
    const fileName = fileUri.split("/").pop() || `upload_${Date.now()}`;

    formData.append(fileType, {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    formData.append("folder", folder);

    console.log("Sending FormData...");
    xhr.send(formData);
  });
}

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
