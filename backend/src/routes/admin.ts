import { Router, Response } from 'express';
import { User, File, Session, AuditLog } from '../models';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { authenticate, authorize } from '../middlewares/auth';
import { validateQuery, schemas } from '../middlewares/validation';
import { asyncHandler } from '../middlewares/errorHandler';

const router = Router();

// Apply authentication and admin authorization to all routes
router.use(authenticate);
router.use(authorize('admin'));

// Get system statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const [
    totalUsers,
    totalFiles,
    totalSessions,
    totalDownloads,
    activeUsers,
    expiredFiles,
  ] = await Promise.all([
    User.countDocuments(),
    File.countDocuments(),
    Session.countDocuments(),
    File.aggregate([{ $group: { _id: null, total: { $sum: '$downloadCount' } } }]),
    User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
    File.countDocuments({ expiresAt: { $lt: new Date() } }),
  ]);

  const totalDownloadsSum = totalDownloads[0]?.total || 0;

  const response: ApiResponse = {
    success: true,
    data: {
      stats: {
        users: {
          total: totalUsers,
          activeLast30Days: activeUsers,
        },
        files: {
          total: totalFiles,
          expired: expiredFiles,
          totalDownloads: totalDownloadsSum,
        },
        sessions: {
          total: totalSessions,
        },
        storage: {
          totalSize: await File.aggregate([
            { $group: { _id: null, total: { $sum: '$size' } } }
          ]).then(result => result[0]?.total || 0),
        },
      },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
}));

// List all users with pagination
router.get('/users',
  validateQuery(schemas.pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, sort, search } = req.query as any;

    const query: any = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOptions[sortField] = sortOrder;

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .select('-refreshTokens')
        .lean(),
      User.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        users,
      },
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// List all files with pagination
router.get('/files',
  validateQuery(schemas.pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, sort, search } = req.query as any;

    const query: any = {};
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: 'i' } },
        { fileId: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOptions[sortField] = sortOrder;

    const skip = (page - 1) * limit;

    const [files, total] = await Promise.all([
      File.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email')
        .lean(),
      File.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        files: files.map(file => ({
          ...file,
          isExpired: new Date() > file.expiresAt,
          canDownload: file.downloadCount < (file.maxDownloads || Infinity) && new Date() <= file.expiresAt,
        })),
      },
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// List all sessions with pagination
router.get('/sessions',
  validateQuery(schemas.pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, sort, search } = req.query as any;

    const query: any = {};
    if (search) {
      query.sessionId = { $regex: search, $options: 'i' };
    }

    const sortOptions: any = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOptions[sortField] = sortOrder;

    const skip = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email')
        .lean(),
      Session.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        sessions: sessions.map(session => ({
          ...session,
          isExpired: new Date() > session.expiresAt,
        })),
      },
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Get audit logs with pagination
router.get('/audit',
  validateQuery(schemas.pagination),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page, limit, sort, search } = req.query as any;

    const query: any = {};
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { ip: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? -1 : 1;
    sortOptions[sortField] = sortOrder;

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('fileId', 'fileId originalName')
        .populate('userId', 'email')
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        logs,
      },
      meta: {
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  })
);

// Delete user (admin only)
router.delete('/users/:userId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UserNotFound',
        message: 'User not found',
      },
    };
    return res.status(404).json(response);
  }

  // Delete all files belonging to user
  const cloudinary = require('cloudinary').v2;
  const files = await File.find({ userId });
  
  for (const file of files) {
    try {
      await cloudinary.uploader.destroy(file.cloudinaryPublicId);
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
    }
  }

  await File.deleteMany({ userId });
  await User.findByIdAndDelete(userId);

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'User and all associated files deleted successfully',
      deletedFiles: files.length,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
}));

// Delete file (admin override)
router.delete('/files/:fileId', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;

  const file = await File.findOne({ fileId });
  if (!file) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FileNotFound',
        message: 'File not found',
      },
    };
    return res.status(404).json(response);
  }

  // Delete from Cloudinary
  const cloudinary = require('cloudinary').v2;
  try {
    await cloudinary.uploader.destroy(file.cloudinaryPublicId);
  } catch (error) {
    console.error('Failed to delete file from Cloudinary:', error);
  }

  await File.deleteOne({ fileId });

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
}));

export default router;
