import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import fs from 'fs';

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

export interface UploadResult {
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
}

export class CloudinaryService {
  /**
   * Uploads an image to Cloudinary.
   */
  static async uploadImage(
    filePath: string,
    folder: string = 'sakhisphere/posts'
  ): Promise<UploadResult> {
    try {
      if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
        console.warn('⚠️ Cloudinary not configured. Storing file locally.');
        return {
          url: filePath,
          publicId: '',
        };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 1080, crop: 'limit' },
        ],
      });

      // Delete local file after upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary image upload failed:', error);
      // Don't delete local file on error - keep as backup
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Uploads a video to Cloudinary.
   */
  static async uploadVideo(
    filePath: string,
    folder: string = 'sakhisphere/posts'
  ): Promise<UploadResult> {
    try {
      if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
        console.warn('⚠️ Cloudinary not configured. Storing file locally.');
        return {
          url: filePath,
          publicId: '',
        };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        eager: [
          { format: 'jpg', effect: 'thumbnail', width: 320, height: 240, crop: 'fill' },
        ],
        eager_async: true,
      });

      // Delete local file after upload
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const thumbnailUrl = result.eager && result.eager.length > 0 
        ? result.eager[0].secure_url 
        : undefined;

      return {
        url: result.secure_url,
        publicId: result.public_id,
        thumbnailUrl,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary video upload failed:', error);
      throw new Error('Failed to upload video');
    }
  }

  /**
   * Uploads a document to Cloudinary.
   */
  static async uploadDocument(
    filePath: string,
    folder: string = 'sakhisphere/verification'
  ): Promise<UploadResult> {
    try {
      if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
        console.warn('⚠️ Cloudinary not configured. Storing file locally.');
        return {
          url: filePath,
          publicId: '',
        };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary document upload failed:', error);
      throw new Error('Failed to upload document');
    }
  }

  /**
   * Deletes a file from Cloudinary.
   */
  static async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      if (publicId && env.cloudinary.cloudName) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });
      }
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
    }
  }

  /**
   * Gets a thumbnail for a video.
   */
  static async getVideoThumbnail(publicId: string): Promise<string | null> {
    try {
      const url = cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 320, height: 240, crop: 'fill' },
        ],
      });

      return url;
    } catch (error) {
      console.error('Failed to get video thumbnail:', error);
      return null;
    }
  }
}