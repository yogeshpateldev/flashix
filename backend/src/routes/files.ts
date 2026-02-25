import { Router } from 'express';
import { Response } from 'express';
import multer from 'multer';
import { FileService } from '../services/fileService';
import { Request, NextFunction } from 'express';
import { AuthenticatedRequest, ApiResponse, JwtPayload } from '../types';
import { authenticate, optionalAuth, optionalSessionAuth, sessionAuth, validateOwnership } from '../middlewares/auth';
import { validate, validateParams, validateQuery, schemas } from '../middlewares/validation';
import { asyncHandler, createError } from '../middlewares/errorHandler';
import config from '../config';

const router = Router();

// Configure multer for memory storage (no disk storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'));
    }
    cb(null, true);
  },
});

// Upload file (authenticated or anonymous)
router.post('/upload', 
  upload.single('file'),
  validate(schemas.fileUpload),
  optionalAuth,
  optionalSessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      throw createError('No file provided', 400);
    }

    const { visibility, password, maxDownloads, expiryHours } = req.body;

    // Determine owner
    let owner: any;
    if (req.user) {
      owner = { type: 'user', userId: req.user._id.toString() };
    } else if (req.session) {
      owner = { type: 'anonymous', sessionId: req.session.sessionId };
    } else {
      throw createError('Authentication required', 401);
    }

    // Upload file
    const file = await FileService.uploadFile(req.file, {
      visibility,
      password,
      maxDownloads,
      expiryHours,
    }, owner);

    // Generate QR code
    const qrCode = await FileService.generateQRCode(file.fileId);

    const response: ApiResponse = {
      success: true,
      data: {
        file: {
          fileId: file.fileId,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          visibility: file.visibility,
          maxDownloads: file.maxDownloads,
          downloadCount: file.downloadCount,
          expiresAt: file.expiresAt,
          createdAt: file.createdAt,
          meta: {
            accessCode: file.meta.accessCode,
            virusScanStatus: file.meta.virusScanStatus,
          },
        },
        downloadUrl: `/api/v1/files/${file.fileId}/download`,
        qrCode,
        shortLink: `${req.protocol}://${req.get('host')}/f/${file.fileId}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.status(201).json(response);
  })
);

// List all public files (accessible to anyone)
router.get('/public',
  validateQuery(schemas.pagination),
  asyncHandler(async (req: any, res: any, next: any) => {
    try {
      const { page, limit, sort, search } = req.query as any;

      const result = await FileService.getPublicFiles(
        { page, limit, sort, search }
      );

      const response: ApiResponse = {
        success: true,
        data: {
          files: result.files,
          pagination: result.pagination,
          stats: {
            total: result.pagination.total,
            active: result.files.filter((f: any) => new Date() < new Date(f.expiresAt)).length,
            expired: result.files.filter((f: any) => new Date() >= new Date(f.expiresAt)).length,
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  })
);

// Get file metadata
router.get('/:fileId',
  validateParams(schemas.fileId),
  optionalAuth,
  optionalSessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    
    const file = await FileService.getFile(fileId);
    if (!file) {
      throw createError('File not found', 404);
    }

    // Check access permissions
    if (file.visibility === 'private') {
      if (!req.user && !req.session) {
        throw createError('Access denied', 401);
      }

      if (req.user && file.ownerType === 'user' && file.userId?.toString() !== req.user._id.toString()) {
        throw createError('Access denied', 403);
      }

      if (req.session && file.ownerType === 'anonymous' && file.sessionId !== req.session.sessionId) {
        throw createError('Access denied', 403);
      }
    }

    const response: ApiResponse = {
      success: true,
      data: {
        file: {
          fileId: file.fileId,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          visibility: file.visibility,
          maxDownloads: file.maxDownloads,
          downloadCount: file.downloadCount,
          expiresAt: file.expiresAt,
          createdAt: file.createdAt,
          isExpired: file.isExpired(),
          canDownload: file.canDownload(),
          meta: {
            accessCode: file.meta.accessCode,
            virusScanStatus: file.meta.virusScanStatus,
          },
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Download file
router.get('/:fileId/download',
  validateParams(schemas.fileId),
  validateQuery(schemas.fileAccess),
  optionalAuth,
  optionalSessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    const { password, accessCode } = req.query as any;
    
    const file = await FileService.getFile(fileId, true); // Include password hash
    if (!file) {
      throw createError('File not found', 404);
    }

    // Check if file can be downloaded
    if (!file.canDownload()) {
      throw createError('File cannot be downloaded', 403);
    }

    // Check password protection
    if (file.visibility === 'password' && file.passwordHash) {
      if (!password) {
        throw createError('Password required', 401);
      }
      
      const bcrypt = require('bcryptjs');
      const isPasswordValid = await bcrypt.compare(password, file.passwordHash);
      if (!isPasswordValid) {
        throw createError('Invalid password', 401);
      }
    }

    // Check access code (alternative to password)
    if (accessCode && accessCode !== file.meta.accessCode) {
      throw createError('Invalid access code', 401);
    }

    // Generate download URL
    const downloadUrl = await FileService.generateDownloadUrl(file, req);

    // Increment download count
    await FileService.incrementDownloadCount(fileId, req);

    // Redirect to Cloudinary URL or stream file
    if (file.visibility === 'private') {
      res.redirect(downloadUrl);
    } else {
      // For public files, we can redirect or stream
      res.redirect(downloadUrl);
    }
  })
);

// Update file (authenticated users only)
router.put('/:fileId',
  validateParams(schemas.fileId),
  validate(schemas.fileUpdate),
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;
    const { visibility, password, maxDownloads, expiryHours } = req.body;

    const owner = { type: 'user' as const, userId: req.user!._id.toString() };
    const file = await FileService.updateFile(fileId, {
      visibility,
      password,
      maxDownloads,
      expiryHours,
    }, owner);

    const response: ApiResponse = {
      success: true,
      data: {
        file: {
          fileId: file.fileId,
          originalName: file.originalName,
          visibility: file.visibility,
          maxDownloads: file.maxDownloads,
          expiresAt: file.expiresAt,
          createdAt: file.createdAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Delete file (authenticated users or anonymous session owners)
router.delete('/:fileId',
  validateParams(schemas.fileId),
  optionalAuth,
  optionalSessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;

    // Determine owner
    let owner: any;
    if (req.user) {
      owner = { type: 'user', userId: req.user._id.toString() };
    } else if (req.session) {
      owner = { type: 'anonymous', sessionId: req.session.sessionId };
    } else {
      throw createError('Authentication required', 401);
    }

    await FileService.deleteFile(fileId, owner);

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'File deleted successfully',
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// List files for authenticated user
router.get('/',
  authenticate,
  validateQuery(schemas.pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, sort, search } = req.query as any;

    const result = await FileService.getFilesByOwner(
      { type: 'user', userId: req.user!._id.toString() },
      { page, limit, sort, search }
    );

    const response: ApiResponse = {
      success: true,
      data: {
        files: result.files.map(file => ({
          fileId: file.fileId,
          originalName: file.originalName,
          size: file.size,
          mimeType: file.mimeType,
          visibility: file.visibility,
          maxDownloads: file.maxDownloads,
          downloadCount: file.downloadCount,
          expiresAt: file.expiresAt,
          createdAt: file.createdAt,
          isExpired: new Date() > file.expiresAt,
          canDownload: file.downloadCount < (file.maxDownloads || Infinity) && new Date() <= file.expiresAt,
          meta: {
            accessCode: file.meta.accessCode,
            virusScanStatus: file.meta.virusScanStatus,
          },
        })),
      },
      meta: {
        pagination: result.pagination,
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Generate QR code for file
router.get('/:fileId/qrcode',
  validateParams(schemas.fileId),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileId } = req.params;

    const file = await FileService.getFile(fileId);
    if (!file) {
      throw createError('File not found', 404);
    }

    const qrCode = await FileService.generateQRCode(fileId);

    // Remove data URL prefix and send as base64
    const base64Data = qrCode.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.type('image/png');
    res.send(buffer);
  })
);

export default router;
