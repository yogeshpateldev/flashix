import { Router, Response } from 'express';
import { Session, File } from '../models';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { sessionAuth, optionalSessionAuth } from '../middlewares/auth';
import { validate, validateParams, schemas } from '../middlewares/validation';
import { asyncHandler, createError } from '../middlewares/errorHandler';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create new anonymous session
router.post('/create', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = uuidv4().replace(/-/g, '');
  const ip = req.ip || '127.0.0.1';
  const userAgent = req.get('User-Agent') || 'Unknown';

  const session = new Session({
    sessionId,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  });

  await session.save();

  // Set session cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  const response: ApiResponse = {
    success: true,
    data: {
      session: {
        sessionId: session.sessionId,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
}));

// Get session details
router.get('/:sessionId',
  validateParams(schemas.sessionId),
  sessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    if (!session) {
      throw createError('Session not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
          isExpired: session.isExpired(),
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// List files in session
router.get('/:sessionId/files',
  validateParams(schemas.sessionId),
  sessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    
    const files = await File.find({ 
      sessionId,
      ownerType: 'anonymous',
    }).sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: {
        files: files.map(file => ({
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
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Claim/transfer session to user account
router.post('/:sessionId/claim',
  validateParams(schemas.sessionId),
  validate(schemas.sessionClaim),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    const { userId } = req.body;

    const session = await Session.findOne({ sessionId });
    if (!session) {
      throw createError('Session not found', 404);
    }

    if (session.isExpired()) {
      throw createError('Session expired', 410);
    }

    // Transfer files to user
    await File.updateMany(
      { sessionId, ownerType: 'anonymous' },
      { 
        ownerType: 'user',
        userId: userId,
        sessionId: undefined,
      }
    );

    // Update session
    session.userId = userId;
    await session.save();

    // Log audit
    const AuditLog = require('../models').AuditLog;
    const auditLog = new AuditLog({
      action: 'session_claim',
      sessionId,
      userId,
      ip: req.ip || '127.0.0.1',
      userAgent: req.get('User-Agent') || 'Unknown',
      timestamp: new Date(),
    });
    await auditLog.save();

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Session claimed successfully',
        transferredFiles: await File.countDocuments({ userId, ownerType: 'user' }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Extend session expiration
router.post('/:sessionId/extend',
  validateParams(schemas.sessionId),
  sessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    if (!session) {
      throw createError('Session not found', 404);
    }

    // Extend by 24 hours
    session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await session.save();

    const response: ApiResponse = {
      success: true,
      data: {
        session: {
          sessionId: session.sessionId,
          expiresAt: session.expiresAt,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Delete session and all associated files
router.delete('/:sessionId',
  validateParams(schemas.sessionId),
  sessionAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sessionId } = req.params;
    
    const session = await Session.findOne({ sessionId });
    if (!session) {
      throw createError('Session not found', 404);
    }

    // Delete all files in session
    const files = await File.find({ sessionId });
    
    // Delete from Cloudinary and database
    const cloudinary = require('cloudinary').v2;
    for (const file of files) {
      try {
        await cloudinary.uploader.destroy(file.cloudinaryPublicId);
      } catch (error) {
        // Log error but continue
        console.error('Failed to delete file from Cloudinary:', error);
      }
    }

    await File.deleteMany({ sessionId });
    await Session.deleteOne({ sessionId });

    // Clear session cookie
    res.clearCookie('sessionId');

    const response: ApiResponse = {
      success: true,
      data: {
        message: 'Session and all associated files deleted successfully',
        deletedFiles: files.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

export default router;
