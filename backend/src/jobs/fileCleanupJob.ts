import { Job, Worker } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import { File, AuditLog } from '../models';
import config from '../config';
import logger from '../utils/logger';
import DatabaseConnection from '../utils/database';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

export interface FileCleanupJobData {
  fileId: string;
  cloudinaryPublicId: string;
  userId?: string;
  sessionId?: string;
  reason: 'expired' | 'manual' | 'admin';
}

export class FileCleanupJob {
  static async process(job: Job<FileCleanupJobData>): Promise<void> {
    const { fileId, cloudinaryPublicId, userId, sessionId, reason } = job.data;
    
    logger.info('Processing file cleanup job', {
      fileId,
      cloudinaryPublicId,
      reason,
      jobId: job.id,
    });

    try {
      // Find the file in database
      const file = await File.findOne({ fileId });
      if (!file) {
        logger.warn('File not found in database during cleanup', { fileId });
        return; // File already deleted, job is idempotent
      }

      // Delete from Cloudinary
      try {
        const result = await cloudinary.uploader.destroy(cloudinaryPublicId);
        logger.info('File deleted from Cloudinary', {
          fileId,
          cloudinaryPublicId,
          result,
        });
      } catch (cloudinaryError) {
        logger.error('Failed to delete file from Cloudinary', {
          fileId,
          cloudinaryPublicId,
          error: cloudinaryError,
        });
        // Continue with database cleanup even if Cloudinary fails
      }

      // Delete from database
      await File.deleteOne({ fileId });

      // Create audit log
      const auditLog = new AuditLog({
        action: 'delete',
        fileId: file._id,
        userId,
        sessionId,
        ip: 'system',
        userAgent: 'Flashix Worker',
        metadata: {
          reason,
          automatedCleanup: true,
          originalName: file.originalName,
          fileSize: file.size,
        },
        timestamp: new Date(),
      });
      await auditLog.save();

      logger.info('File cleanup completed successfully', {
        fileId,
        originalName: file.originalName,
        reason,
      });

    } catch (error) {
      logger.error('File cleanup job failed', {
        fileId,
        cloudinaryPublicId,
        error,
        jobId: job.id,
      });
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  static async scheduleExpiredFileCleanup(): Promise<void> {
    logger.info('Scheduling cleanup for expired files');

    try {
      // Find all expired files
      const expiredFiles = await File.find({
        expiresAt: { $lt: new Date() },
      });

      logger.info(`Found ${expiredFiles.length} expired files to clean up`);

      // Create cleanup jobs for each expired file
      const { Queue } = require('bullmq');
      const { createClient } = require('redis');

      const redisClient = createClient({ url: config.worker.redisUrl });
      await redisClient.connect();

      const cleanupQueue = new Queue('file-cleanup', {
        connection: redisClient,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      for (const file of expiredFiles) {
        await cleanupQueue.add(
          'cleanup-expired-file',
          {
            fileId: file.fileId,
            cloudinaryPublicId: file.cloudinaryPublicId,
            userId: file.userId?.toString(),
            sessionId: file.sessionId,
            reason: 'expired' as const,
          },
          {
            delay: 0, // Process immediately
            priority: 10, // Higher priority for expired files
          }
        );
      }

      await redisClient.quit();
      await cleanupQueue.close();

      logger.info(`Scheduled cleanup for ${expiredFiles.length} expired files`);

    } catch (error) {
      logger.error('Failed to schedule expired file cleanup', { error });
      throw error;
    }
  }

  static async cleanupOrphanedFiles(): Promise<void> {
    logger.info('Starting orphaned files cleanup');

    try {
      // Find files that exist in Cloudinary but not in our database
      // This is more complex and would require listing all Cloudinary resources
      // For now, we'll focus on database consistency
      
      const db = DatabaseConnection.getInstance();
      await db.connectMongoDB();

      // Find files with missing Cloudinary resources (optional)
      // This would require checking each file's Cloudinary URL
      logger.info('Orphaned files cleanup completed');

    } catch (error) {
      logger.error('Orphaned files cleanup failed', { error });
      throw error;
    }
  }

  static async getCleanupStats(): Promise<{
    totalFiles: number;
    expiredFiles: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
  }> {
    try {
      const [totalFiles, expiredFiles] = await Promise.all([
        File.countDocuments(),
        File.countDocuments({ expiresAt: { $lt: new Date() } }),
      ]);

      // Get queue stats
      const { Queue, Worker } = require('bullmq');
      const { createClient } = require('redis');

      const redisClient = createClient({ url: config.worker.redisUrl });
      await redisClient.connect();

      const cleanupQueue = new Queue('file-cleanup', {
        connection: redisClient,
      });

      const [waiting, active, completed, failed] = await Promise.all([
        cleanupQueue.getWaiting(),
        cleanupQueue.getActive(),
        cleanupQueue.getCompleted(),
        cleanupQueue.getFailed(),
      ]);

      await redisClient.quit();
      await cleanupQueue.close();

      return {
        totalFiles,
        expiredFiles,
        pendingJobs: waiting.length + active.length,
        completedJobs: completed.length,
        failedJobs: failed.length,
      };

    } catch (error) {
      logger.error('Failed to get cleanup stats', { error });
      throw error;
    }
  }
}
