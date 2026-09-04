// src/upload/upload.controller.ts - Complete fixed version
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CloudinaryService } from '../services/cloudinary.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// Separate multer instances for image and video
const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type') as any);
    }
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for videos
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid video type. Allowed: MP4, WEBM, MOV') as any);
    }
  },
});

export class UploadController {
  /**
   * POST /api/upload/image
   * Uploads an image to Cloudinary.
   */
  static async uploadImage(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload an image file' });
        return;
      }

      console.log(`📤 Uploading image: ${req.file.originalname}`);

      const folder = req.body.folder || `sakhisphere/posts/user_${req.user.id}`;
      const result = await CloudinaryService.uploadImage(req.file.path, folder);

      console.log('✅ Image upload result:', result);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Image upload error:', error);
      next(error);
    }
  }

  /**
 * POST /api/upload/chunked
 * Uploads file in chunks.
 */
static async uploadChunked(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { chunks, mimeType, folder, fileName, fileType } = req.body;

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      res.status(400).json({ success: false, message: 'chunks array is required' });
      return;
    }

    console.log(`📤 Uploading chunked file: ${chunks.length} chunks, type: ${mimeType}`);

    // Combine chunks
    const fullBase64 = chunks.join('');
    const buffer = Buffer.from(fullBase64, 'base64');

    // Save to temp file
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const extension = mimeType === 'video/mp4' ? '.mp4' : 
                     mimeType === 'video/webm' ? '.webm' :
                     mimeType === 'video/quicktime' ? '.mov' :
                     mimeType === 'image/png' ? '.png' :
                     mimeType === 'image/webp' ? '.webp' : '.jpg';

    const finalFileName = fileName || `chunked_${Date.now()}${extension}`;
    const filePath = path.join(uploadDir, finalFileName);

    fs.writeFileSync(filePath, buffer);

    console.log(`📁 Saved file: ${finalFileName}, Size: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB`);

    const uploadFolder = folder || `sakhisphere/posts/user_${req.user.id}`;
    
    let result;
    if (mimeType.startsWith('image/')) {
      result = await CloudinaryService.uploadImage(filePath, uploadFolder);
    } else if (mimeType.startsWith('video/')) {
      result = await CloudinaryService.uploadVideo(filePath, uploadFolder);
    } else {
      result = await CloudinaryService.uploadDocument(filePath, uploadFolder);
    }

    console.log('✅ Chunked upload result:', result);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ Chunked upload error:', error);
    next(error);
  }
}


  /**
   * POST /api/upload/video
   * Uploads a video to Cloudinary.
   */
  static async uploadVideo(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ success: false, message: 'Please upload a video file' });
        return;
      }

      console.log(`📤 Uploading video: ${req.file.originalname}`);

      const folder = req.body.folder || `sakhisphere/posts/user_${req.user.id}`;
      const result = await CloudinaryService.uploadVideo(req.file.path, folder);

      console.log('✅ Video upload result:', result);

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: result,
      });
    } catch (error) {
      console.error('❌ Video upload error:', error);
      next(error);
    }
  }

  /**
   * DELETE /api/upload/:publicId
   * Deletes a file from Cloudinary.
   */
  static async deleteFile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { publicId } = req.params;
      const { resourceType } = req.query;

      if (!publicId) {
        res.status(400).json({ success: false, message: 'publicId is required' });
        return;
      }

      await CloudinaryService.deleteFile(
        publicId,
        (resourceType as 'image' | 'video' | 'raw') || 'image'
      );

      res.status(200).json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}