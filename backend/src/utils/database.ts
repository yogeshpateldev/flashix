import mongoose from 'mongoose';
import { createClient } from 'redis';
import logger from './logger';
import config from '../config';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private mongoConnection: typeof mongoose | null = null;
  private redisClient: ReturnType<typeof createClient> | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connectMongoDB(): Promise<typeof mongoose> {
    if (this.mongoConnection) {
      return this.mongoConnection;
    }

    try {
      this.mongoConnection = await mongoose.connect(config.database.mongo.uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      });

      logger.info('MongoDB connected successfully');
      
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return this.mongoConnection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  public async connectRedis(): Promise<ReturnType<typeof createClient>> {
    if (this.redisClient && this.redisClient.isOpen) {
      return this.redisClient;
    }

    try {
      this.redisClient = createClient({
        url: config.database.redis.url,
        socket: {
          reconnectStrategy: (retries: number) => Math.min(retries * 50, 500),
        },
      });

      this.redisClient.on('error', (error: any) => {
        logger.error('Redis client error:', error);
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected');
      });

      this.redisClient.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      await this.redisClient.connect();
      return this.redisClient;
    } catch (error) {
      logger.error('Redis connection failed:', error);
      throw error;
    }
  }

  public async disconnectMongoDB(): Promise<void> {
    if (this.mongoConnection) {
      await mongoose.disconnect();
      this.mongoConnection = null;
      logger.info('MongoDB disconnected');
    }
  }

  public async disconnectRedis(): Promise<void> {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
      this.redisClient = null;
      logger.info('Redis disconnected');
    }
  }

  public async disconnectAll(): Promise<void> {
    await Promise.all([
      this.disconnectMongoDB(),
      this.disconnectRedis(),
    ]);
  }

  public getRedisClient(): ReturnType<typeof createClient> | null {
    return this.redisClient;
  }

  public getMongoConnection(): typeof mongoose | null {
    return this.mongoConnection;
  }
}

export default DatabaseConnection;
