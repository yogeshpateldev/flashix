import mongoose, { Schema, Model } from 'mongoose';
import { IAuditLog } from '../types';

const auditLogSchema = new Schema<IAuditLog>({
  action: {
    type: String,
    enum: ['upload', 'download', 'delete', 'access_denied', 'session_claim'],
    required: true,
  },
  fileId: {
    type: Schema.Types.ObjectId,
    ref: 'File',
    required: false,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  sessionId: {
    type: String,
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
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ fileId: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ sessionId: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog: Model<IAuditLog> = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
