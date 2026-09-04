import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CloudinaryService } from '../services/cloudinary.service';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CustomError } from '../middleware/errorHandler';

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
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type. Allowed: JPG, PNG, WEBP, GIF') as any);
    }
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
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
   * Uploads an image.
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

      const folder = req.body.folder || `sakhisphere/users/${req.user.id}`;
      const result = await CloudinaryService.uploadImage(req.file.path, folder);

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/upload/video
   * Uploads a video.
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

      const folder = req.body.folder || `sakhisphere/users/${req.user.id}`;
      const result = await CloudinaryService.uploadVideo(req.file.path, folder);

      res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/upload/base64
   * Uploads a base64 encoded image.
   */
  static async uploadBase64(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { base64, mimeType, folder } = req.body;

      if (!base64 || !mimeType) {
        res.status(400).json({ success: false, message: 'base64 and mimeType are required' });
        return;
      }

      // Save base64 to temp file
      const uploadDir = path.join(__dirname, '../../uploads/temp');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const extension = mimeType === 'image/png' ? '.png' : 
                       mimeType === 'image/webp' ? '.webp' : 
                       mimeType === 'image/gif' ? '.gif' : '.jpg';
      
      const fileName = `base64_${Date.now()}${extension}`;
      const filePath = path.join(uploadDir, fileName);

      const buffer = Buffer.from(base64, 'base64');
      fs.writeFileSync(filePath, buffer);

      const uploadFolder = folder || `sakhisphere/users/${req.user.id}`;
      
      let result;
      if (mimeType.startsWith('image/')) {
        result = await CloudinaryService.uploadImage(filePath, uploadFolder);
      } else if (mimeType.startsWith('video/')) {
        result = await CloudinaryService.uploadVideo(filePath, uploadFolder);
      } else {
        result = await CloudinaryService.uploadDocument(filePath, uploadFolder);
      }

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result,
      });
    } catch (error) {
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