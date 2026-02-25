import { Worker, Queue } from 'bullmq';
import { createClient } from 'redis';
import { FileCleanupJob, FileCleanupJobData } from './jobs/fileCleanupJob';
import config from './config';
import logger from './utils/logger';
import DatabaseConnection from './utils/database';

class FileCleanupWorker {
  private worker!: Worker<FileCleanupJobData>;
  private redisClient!: ReturnType<typeof createClient>;
  private database: DatabaseConnection;

  constructor() {
    this.database = DatabaseConnection.getInstance();
  }

  async start(): Promise<void> {
    try {
      // Connect to database
      await this.database.connectMongoDB();
      logger.info('Worker connected to database');

      // Connect to Redis
      this.redisClient = createClient({ url: config.worker.redisUrl });
      await this.redisClient.connect();
      logger.info('Worker connected to Redis');

      // Create worker
      this.worker = new Worker<FileCleanupJobData>(
        'file-cleanup',
        async (job: any) => {
          logger.info('Processing job', {
            jobId: job.id,
            name: job.name,
            data: job.data,
          });

          await FileCleanupJob.process(job);
        },
        {
          connection: { url: config.worker.redisUrl } as any,
          concurrency: config.worker.concurrency,
          limiter: {
            max: 100,
            duration: 60000, // 1 minute
          },
        }
      );

      // Set up event listeners
      this.setupEventListeners();

      logger.info('File cleanup worker started', {
        concurrency: config.worker.concurrency,
        redisUrl: config.worker.redisUrl,
      });

      // Schedule periodic cleanup of expired files
      this.startPeriodicCleanup();

    } catch (error) {
      logger.error('Failed to start worker', { error });
      throw error;
    }
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job: any) => {
      logger.info('Job completed', {
        jobId: job.id,
        name: job.name,
        data: job.data,
      });
    });

    this.worker.on('failed', (job: any, err: any) => {
      logger.error('Job failed', {
        jobId: job?.id,
        name: job?.name,
        data: job?.data,
        error: err.message,
        stack: err.stack,
      });
    });

    this.worker.on('error', (err: any) => {
      logger.error('Worker error', { error: err.message, stack: err.stack });
    });

    this.worker.on('stalled', (job: any) => {
      logger.warn('Job stalled', {
        jobId: job.id,
        name: job.name,
        data: job.data,
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => this.gracefulShutdown('SIGUSR2')); // nodemon restart
  }

  private startPeriodicCleanup(): void {
    // Schedule cleanup every hour
    const cleanupInterval = setInterval(async () => {
      try {
        logger.info('Starting periodic expired file cleanup');
        await FileCleanupJob.scheduleExpiredFileCleanup();
      } catch (error) {
        logger.error('Periodic cleanup failed', { error });
      }
    }, 60 * 60 * 1000); // 1 hour

    // Run initial cleanup
    setTimeout(async () => {
      try {
        logger.info('Starting initial expired file cleanup');
        await FileCleanupJob.scheduleExpiredFileCleanup();
      } catch (error) {
        logger.error('Initial cleanup failed', { error });
      }
    }, 5000); // 5 seconds after startup

    // Cleanup orphaned files every 6 hours
    const orphanedCleanupInterval = setInterval(async () => {
      try {
        logger.info('Starting orphaned file cleanup');
        await FileCleanupJob.cleanupOrphanedFiles();
      } catch (error) {
        logger.error('Orphaned cleanup failed', { error });
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Clear intervals on graceful shutdown
    process.on('SIGTERM', () => {
      clearInterval(cleanupInterval);
      clearInterval(orphanedCleanupInterval);
    });
    process.on('SIGINT', () => {
      clearInterval(cleanupInterval);
      clearInterval(orphanedCleanupInterval);
    });
  }

  private async gracefulShutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Stop accepting new jobs
      if (this.worker) {
        await this.worker.close();
        logger.info('Worker closed');
      }

      // Close Redis connection
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.quit();
        logger.info('Redis connection closed');
      }

      // Close database connection
      await this.database.disconnectAll();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  }

  async getStats(): Promise<any> {
    try {
      const cleanupStats = await FileCleanupJob.getCleanupStats();
      
      const queue = new Queue('file-cleanup', {
        connection: { url: config.worker.redisUrl } as any,
      });

      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
      ]);

      await queue.close();

      return {
        worker: {
          status: 'running',
          concurrency: config.worker.concurrency,
        },
        queue: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
        cleanup: cleanupStats,
      };
    } catch (error) {
      logger.error('Failed to get worker stats', { error });
      throw error;
    }
  }
}

// Start worker if this file is run directly
if (require.main === module) {
  const worker = new FileCleanupWorker();
  
  worker.start().catch((error) => {
    logger.error('Failed to start worker', { error });
    process.exit(1);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    process.exit(1);
  });
}

export default FileCleanupWorker;
