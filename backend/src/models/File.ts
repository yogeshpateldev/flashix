import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { IFile } from '../types';

const fileSchema = new Schema<IFile>({
  fileId: {
    type: String,
    required: true,
    unique: true,
    default: () => nanoid(8),
  },
  ownerType: {
    type: String,
    enum: ['anonymous', 'user'],
    required: true,
  },
  sessionId: {
    type: String,
    required: function (this: IFile) {
      return this.ownerType === 'anonymous';
    },
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function (this: IFile) {
      return this.ownerType === 'user';
    },
  },
  originalName: {
    type: String,
    required: true,
    maxlength: 255,
  },
  cloudinaryPublicId: {
    type: String,
    required: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  cloudinaryResourceType: {
    type: String,
    enum: ['image', 'video', 'raw'],
    default: 'raw',
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'password'],
    default: 'public',
  },
  passwordHash: {
    type: String,
    required: function (this: IFile) {
      return this.visibility === 'password';
    },
    select: false,
  },
  maxDownloads: {
    type: Number,
    min: 1,
    max: 1000,
  },
  downloadCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
  size: {
    type: Number,
    required: true,
    min: 1,
  },
  mimeType: {
    type: String,
    required: true,
  },
  meta: {
    checksum: String,
    virusScanStatus: {
      type: String,
      enum: ['pending', 'clean', 'infected'],
      default: 'pending',
    },
    accessCode: {
      type: String,
      default: () => Math.random().toString(36).substring(2, 8).toUpperCase(),
    },
  },
}, {
  timestamps: true,
  toJSON: {
    transform: function (doc: any, ret: any) {
      if (ret.passwordHash) delete ret.passwordHash;
      if (ret.cloudinaryPublicId) delete ret.cloudinaryPublicId;
      return ret;
    },
  },
});

// No explicit index needed — fileId already indexed via unique: true
fileSchema.index({ sessionId: 1 });
fileSchema.index({ userId: 1 });
fileSchema.index({ expiresAt: 1 }); // used for expiry queries
fileSchema.index({ ownerType: 1, createdAt: -1 }); // compound index for listing

fileSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

fileSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

fileSchema.methods.canDownload = function (): boolean {
  if (this.isExpired()) return false;
  if (this.maxDownloads && this.downloadCount >= this.maxDownloads) return false;
  if (this.meta.virusScanStatus === 'infected') return false;
  return true;
};

fileSchema.methods.incrementDownload = async function (): Promise<void> {
  this.downloadCount += 1;
  await this.save();
};

export const File: Model<IFile> = mongoose.model<IFile>('File', fileSchema);
export default File;
