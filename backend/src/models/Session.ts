import mongoose, { Schema, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ISession } from '../types';

const sessionSchema = new Schema<ISession>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4().replace(/-/g, ''),
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
}, {
  timestamps: true,
});

// No explicit index needed — sessionId already indexed via unique: true
sessionSchema.index({ userId: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index auto-deletes expired sessions

sessionSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

export const Session: Model<ISession> = mongoose.model<ISession>('Session', sessionSchema);
export default Session;
