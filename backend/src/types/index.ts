import { Document, Types } from 'mongoose';
import { Request, Response } from 'express';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'user' | 'admin';
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface ISession extends Document {
  _id: Types.ObjectId;
  sessionId: string;
  userId?: Types.ObjectId;
  ip: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  isExpired(): boolean;
}

export interface IFile extends Document {
  _id: Types.ObjectId;
  fileId: string;
  ownerType: 'anonymous' | 'user';
  sessionId?: string;
  userId?: Types.ObjectId;
  originalName: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  visibility: 'public' | 'private' | 'password';
  passwordHash?: string;
  maxDownloads?: number;
  downloadCount: number;
  expiresAt: Date;
  createdAt: Date;
  size: number;
  mimeType: string;
  meta: {
    checksum?: string;
    virusScanStatus: 'pending' | 'clean' | 'infected';
    accessCode?: string;
  };
  isExpired(): boolean;
  canDownload(): boolean;
  incrementDownload(): Promise<void>;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  action: 'upload' | 'download' | 'delete' | 'access_denied' | 'session_claim';
  fileId?: Types.ObjectId;
  userId?: Types.ObjectId;
  sessionId?: string;
  ip: string;
  userAgent: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

export interface IQueueJob {
  name: string;
  data: {
    fileId: string;
    cloudinaryPublicId: string;
    userId?: string;
    sessionId?: string;
  };
  opts?: {
    delay?: number;
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
  };
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  session?: ISession;
  requestId: string;
}

export interface FileUploadRequest {
  file: Express.Multer.File;
  visibility?: 'public' | 'private' | 'password';
  password?: string;
  maxDownloads?: number;
  expiryHours?: number;
}

export interface FileDownloadRequest {
  fileId: string;
  password?: string;
  accessCode?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp: string;
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface RedisCacheData {
  fileId: string;
  cloudinaryUrl: string;
  downloadCount: number;
  expiresAt: Date;
  visibility: string;
  passwordHash?: string;
}
