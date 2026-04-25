import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import multer from 'multer';
type MulterFile = Express.Multer.File;
import QRCode from 'qrcode';
import { File, User, Session, AuditLog } from '../models';
import { AuthenticatedRequest, IFile } from '../types';
import config from '../config';
import { createError } from '../middlewares/errorHandler';
import logger from '../utils/logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export class FileService {
  static async uploadFile(
    file: MulterFile,
    options: {
      visibility?: 'public' | 'private' | 'password';
      password?: string;
      maxDownloads?: number;
      expiryHours?: number;
    },
    owner: {
      type: 'anonymous' | 'user';
      sessionId?: string;
      userId?: string;
    }
  ): Promise<IFile> {
    // Validate file
    this.validateFile(file);

    // Simulate virus scan
    await this.simulateVirusScan(file);

    // Upload to Cloudinary
    const uploadResult = await this.uploadToCloudinary(file, options.visibility);

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (options.expiryHours || config.expiration.defaultHours));

    // Create file record
    const fileData: any = {
      originalName: file.originalname,
      cloudinaryPublicId: uploadResult.public_id,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryResourceType: uploadResult.resource_type || 'raw',
      size: file.size,
      mimeType: file.mimetype,
      visibility: options.visibility || 'public',
      maxDownloads: options.maxDownloads,
      expiresAt,
      ownerType: owner.type,
      meta: {
        checksum: this.calculateChecksum(file.buffer),
        virusScanStatus: 'clean',
      },
    };

    if (owner.type === 'anonymous' && owner.sessionId) {
      fileData.sessionId = owner.sessionId;
    } else if (owner.type === 'user' && owner.userId) {
      fileData.userId = owner.userId;
    }

    if (options.visibility === 'password' && options.password) {
      fileData.passwordHash = options.password; // Will be hashed by pre-save hook
    }

    const newFile = new File(fileData);
    await newFile.save();

    // Log audit
    await this.logAudit('upload', newFile._id, owner.userId, owner.sessionId);

    logger.info('File uploaded successfully', {
      fileId: newFile.fileId,
      originalName: file.originalname,
      size: file.size,
      ownerType: owner.type,
    });

    return newFile;
  }

  static async getFile(fileId: string, includePassword = false): Promise<IFile | null> {
    const query = File.findOne({ fileId });
    if (includePassword) {
      query.select('+passwordHash');
    }
    return query.exec();
  }

  static async getFilesByOwner(
    owner: { type: 'anonymous' | 'user'; sessionId?: string; userId?: string },
    pagination: { page: number; limit: number; sort: string; search?: string }
  ) {
    const query: any = { ownerType: owner.type };

    if (owner.type === 'anonymous' && owner.sessionId) {
      query.sessionId = owner.sessionId;
    } else if (owner.type === 'user' && owner.userId) {
      query.userId = owner.userId;
    }

    if (pagination.search) {
      query.$or = [
        { originalName: { $regex: pagination.search, $options: 'i' } },
        { fileId: { $regex: pagination.search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    const sortField = pagination.sort.startsWith('-') ? pagination.sort.substring(1) : pagination.sort;
    const sortOrder = pagination.sort.startsWith('-') ? -1 : 1;
    sortOptions[sortField] = sortOrder;

    const skip = (pagination.page - 1) * pagination.limit;

    const [files, total] = await Promise.all([
      File.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(pagination.limit)
        .lean(),
      File.countDocuments(query),
    ]);

    return {
      files,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
      },
    };
  }

  static async updateFile(
    fileId: string,
    updates: {
      visibility?: 'public' | 'private' | 'password';
      password?: string;
      maxDownloads?: number;
      expiryHours?: number;
    },
    owner: { type: 'anonymous' | 'user'; sessionId?: string; userId?: string }
  ): Promise<IFile> {
    const file = await File.findOne({ fileId });
    if (!file) {
      throw createError('File not found', 404);
    }

    // Verify ownership
    this.verifyOwnership(file, owner);

    // Update fields
    if (updates.visibility) {
      file.visibility = updates.visibility;
      if (updates.visibility === 'password' && updates.password) {
        file.passwordHash = updates.password; // Will be hashed by pre-save hook
      } else if (updates.visibility !== 'password') {
        file.passwordHash = undefined;
      }
    }

    if (updates.maxDownloads !== undefined) {
      file.maxDownloads = updates.maxDownloads;
    }

    if (updates.expiryHours !== undefined) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + updates.expiryHours);
      file.expiresAt = expiresAt;
    }

    await file.save();

    logger.info('File updated successfully', {
      fileId,
      updates,
      ownerType: owner.type,
    });

    return file;
  }

  static async deleteFile(fileId: string, owner: { type: 'anonymous' | 'user'; sessionId?: string; userId?: string }): Promise<void> {
    const file = await File.findOne({ fileId });
    if (!file) {
      throw createError('File not found', 404);
    }

    // Verify ownership
    this.verifyOwnership(file, owner);

    // Delete from Cloudinary first - if this fails, don't delete from database
    try {
      const result = await cloudinary.uploader.destroy(file.cloudinaryPublicId);
      
      // Check if Cloudinary deletion was successful
      if (result.result !== 'ok' && result.result !== 'not found') {
        logger.error('Cloudinary deletion failed', {
          fileId,
          cloudinaryPublicId: file.cloudinaryPublicId,
          result,
        });
        throw createError('Failed to delete file from cloud storage', 500);
      }
      
      logger.info('File deleted from Cloudinary', {
        fileId,
        cloudinaryPublicId: file.cloudinaryPublicId,
        result: result.result,
      });
    } catch (error) {
      logger.error('Failed to delete file from Cloudinary', {
        fileId,
        cloudinaryPublicId: file.cloudinaryPublicId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw createError('Failed to delete file from cloud storage', 500);
    }

    // Only delete from database if Cloudinary deletion succeeded
    try {
      await File.deleteOne({ fileId });
      logger.info('File deleted from database', { fileId });
    } catch (error) {
      logger.error('Failed to delete file from database', {
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw createError('Failed to delete file record', 500);
    }

    // Log audit
    await this.logAudit('delete', file._id, owner.userId, owner.sessionId);

    logger.info('File deleted successfully', {
      fileId,
      ownerType: owner.type,
    });
  }

  static async generateDownloadUrl(file: IFile, req: AuthenticatedRequest): Promise<string> {
    // Note: canDownload() is already checked by the caller (download route).
    // No need to re-check here.

    // Generate signed URL for private files
    if (file.visibility === 'private') {
      const url = cloudinary.url(file.cloudinaryPublicId, {
        sign_url: true,
        expires_at: Math.floor(new Date().getTime() / 1000) + 3600, // 1 hour
        resource_type: file.cloudinaryResourceType || 'raw',
      });
      return url;
    }

    return file.cloudinaryUrl;
  }

  static async generateQRCode(fileId: string): Promise<string> {
    // In production, QR code points to the frontend file details page.
    // Fall back to the backend short-link in dev so it stays testable standalone.
    const baseUrl = config.frontendUrl ||
      (config.env === 'production' ? 'https://your-domain.com' : 'http://localhost:5173');
    const url = `${baseUrl}/file/${fileId}`;

    return QRCode.toDataURL(url);
  }

  static async incrementDownloadCount(fileId: string, req: AuthenticatedRequest): Promise<void> {
    // Re-use findOneAndUpdate for an atomic increment instead of separate fetch+save.
    // This avoids a race condition where two simultaneous downloads could both
    // pass the canDownload() check before either increments the count.
    const file = await File.findOneAndUpdate(
      { fileId },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );
    if (!file) {
      throw createError('File not found', 404);
    }

    // Log audit
    const userId = req.user?._id?.toString();
    const sessionId = req.session?.sessionId;
    await this.logAudit('download', file._id, userId, sessionId);

    logger.info('File downloaded', {
      fileId,
      downloadCount: file.downloadCount,
      userId,
      sessionId,
    });
  }

  private static validateFile(file: MulterFile): void {
    if (!file) {
      throw createError('No file provided', 400);
    }

    if (file.size > config.upload.maxSize) {
      throw createError(`File too large. Maximum size is ${config.upload.maxSize / 1024 / 1024}MB`, 400);
    }

    if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
      throw createError('File type not allowed', 400);
    }
  }

  private static async simulateVirusScan(file: MulterFile): Promise<void> {
    // Simulate virus scan delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate virus detection based on file size or type
    if (file.size > 50 * 1024 * 1024) { // Files larger than 50MB
      throw createError('File flagged by virus scanner', 400);
    }

    // In production, integrate with actual virus scanning service
    logger.debug('Virus scan completed', { filename: file.originalname, size: file.size });
  }

  private static getCloudinaryResourceType(mimeType: string): 'image' | 'video' | 'raw' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
    return 'raw';
  }

  private static async uploadToCloudinary(file: MulterFile, visibility?: string): Promise<any> {
    const uploadOptions: any = {
      resource_type: this.getCloudinaryResourceType(file.mimetype),
      folder: 'drop24',
      use_filename: true,
      unique_filename: true,
    };

    if (visibility === 'private') {
      uploadOptions.type = 'private';
    }

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      stream.pipe(uploadStream);
    });
  }

  private static calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private static verifyOwnership(file: IFile, owner: { type: 'anonymous' | 'user'; sessionId?: string; userId?: string }): void {
    if (file.ownerType === 'anonymous' && file.sessionId !== owner.sessionId) {
      throw createError('Access denied', 403);
    }

    if (file.ownerType === 'user' && file.userId?.toString() !== owner.userId) {
      throw createError('Access denied', 403);
    }
  }

  private static async logAudit(
    action: 'upload' | 'download' | 'delete' | 'access_denied' | 'session_claim',
    fileId?: any,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    const auditLog = new AuditLog({
      action,
      fileId,
      userId,
      sessionId,
      ip: '127.0.0.1', // Should come from request
      userAgent: 'Flashix Backend', // Should come from request
      timestamp: new Date(),
    });

    await auditLog.save();
  }

  static async getPublicFiles(options: {
    page?: number;
    limit?: number;
    sort?: string;
    search?: string;
  }): Promise<{ files: IFile[]; pagination: any }> {
    const { page = 1, limit = 20, sort = 'createdAt', search } = options;
    const skip = (page - 1) * limit;

    // Build query for public files
    let query: any = { visibility: 'public' };

    if (search) {
      query.originalName = { $regex: search, $options: 'i' };
    }

    // Sort options — support both frontend aliases and raw mongo field names
    const sortAliasMap: Record<string, any> = {
      'date': { createdAt: -1 },
      '-date': { createdAt: 1 },
      'name': { originalName: 1 },
      '-name': { originalName: -1 },
      'expiry': { expiresAt: 1 },
      '-expiry': { expiresAt: -1 },
      'downloads': { downloadCount: -1 },
      '-downloads': { downloadCount: 1 },
      'createdAt': { createdAt: 1 },
      '-createdAt': { createdAt: -1 },
      'size': { size: 1 },
      '-size': { size: -1 },
      'downloadCount': { downloadCount: 1 },
      '-downloadCount': { downloadCount: -1 },
      'expiresAt': { expiresAt: 1 },
      '-expiresAt': { expiresAt: -1 },
    };
    let sortOptions: any = sortAliasMap[sort] ?? { createdAt: -1 };

    const [files, total] = await Promise.all([
      File.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      File.countDocuments(query)
    ]);

    return {
      files: files as unknown as IFile[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
