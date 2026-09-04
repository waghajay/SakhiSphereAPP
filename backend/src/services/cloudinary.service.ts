import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import fs from 'fs';
import path from 'path'; // Add this import

// Configure Cloudinary only if credentials are available
if (env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

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
   * Check if Cloudinary is configured.
   */
  private static isConfigured(): boolean {
    return Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
  }

  /**
   * Uploads an image to Cloudinary or returns local path.
   */
  static async uploadImage(filePath: string, folder: string = 'sakhisphere/posts'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Cloudinary not configured. Using local file path.');
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
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
      return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
    }
  }

  /**
   * Uploads a video to Cloudinary or returns local path.
   */
  static async uploadVideo(filePath: string, folder: string = 'sakhisphere/posts'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Cloudinary not configured. Using local file path.');
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
      }

      console.log(`🎬 Uploading video to Cloudinary: ${filePath}`);

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'video',
        allowed_formats: ['mp4', 'webm', 'mov'],
        chunk_size: 6000000, // 6MB chunks
      });

      console.log('✅ Video uploaded to Cloudinary');

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
      console.error('❌ Cloudinary video upload failed:', error);
      // Return local path as fallback
      const fallbackUrl = `/uploads/${path.basename(filePath)}`;
      console.log('📁 Using local fallback:', fallbackUrl);
      return { url: fallbackUrl, publicId: '' };
    }
  }

  /**
   * Uploads a document to Cloudinary or returns local path.
   */
  static async uploadDocument(filePath: string, folder: string = 'sakhisphere/verification'): Promise<UploadResult> {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Cloudinary not configured. Using local file path.');
        return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
      }

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
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
      return { url: `/uploads/${path.basename(filePath)}`, publicId: '' };
    }
  }

  /**
   * Deletes a file from Cloudinary.
   */
  static async deleteFile(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'image'): Promise<void> {
    try {
      if (publicId && this.isConfigured()) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });
      }
    } catch (error) {
      console.error('Cloudinary delete failed:', error);
    }
  }
}