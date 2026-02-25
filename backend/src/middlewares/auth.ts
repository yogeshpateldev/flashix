import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, Session } from '../models';
import { AuthenticatedRequest, JwtPayload } from '../types';
import config from '../config';
import { createError } from './errorHandler';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token required', 401);
    }

    const token = authHeader.substring(7);
    
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    if (decoded.type !== 'access') {
      throw createError('Invalid token type', 401);
    }

    const user = await User.findById(decoded.sub).select('+refreshTokens');
    
    if (!user) {
      throw createError('User not found', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      if (decoded.type === 'access') {
        const user = await User.findById(decoded.sub);
        req.user = user || undefined;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't throw errors, just continue without user
    next();
  }
};

export const sessionAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies.sessionId || req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      throw createError('Session ID required', 401);
    }

    const session = await Session.findOne({ sessionId });
    
    if (!session || session.isExpired()) {
      throw createError('Invalid or expired session', 401);
    }

    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalSessionAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionId = req.cookies.sessionId || req.headers['x-session-id'] as string;
    
    if (sessionId) {
      const session = await Session.findOne({ sessionId });
      
      if (session && !session.isExpired()) {
        req.session = session;
      }
    }

    next();
  } catch (error) {
    // For optional session auth, we don't throw errors
    next();
  }
};

export const validateOwnership = (resourceType: 'file' | 'session') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user && !req.session) {
        throw createError('Authentication required', 401);
      }

      const resourceId = req.params.fileId || req.params.sessionId;
      
      if (resourceType === 'file') {
        const { File } = await import('../models/index.js');
        const file = await File.findOne({ fileId: resourceId });
        
        if (!file) {
          throw createError('File not found', 404);
        }

        // Check ownership
        if (req.user && file.ownerType === 'user' && file.userId?.toString() !== req.user._id.toString()) {
          throw createError('Access denied', 403);
        }

        if (req.session && file.ownerType === 'anonymous' && file.sessionId !== req.session.sessionId) {
          throw createError('Access denied', 403);
        }

        if (!req.user && !req.session) {
          throw createError('Access denied', 403);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
