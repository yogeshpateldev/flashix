import { Router, Request, Response } from 'express';
import DatabaseConnection from '../utils/database';
import { ApiResponse } from '../types';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const db = DatabaseConnection.getInstance();
  const mongoConnection = db.getMongoConnection();
  const redisClient = db.getRedisClient();

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: {
        status: mongoConnection?.connection.readyState === 1 ? 'connected' : 'disconnected',
        readyState: mongoConnection?.connection.readyState,
      },
      redis: {
        status: redisClient?.isOpen ? 'connected' : 'disconnected',
      },
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100,
    },
  };

  // Determine overall health status
  const isHealthy = health.services.database.status === 'connected' && 
                   (health.services.redis.status === 'connected' || !redisClient);

  const response: ApiResponse = {
    success: isHealthy,
    data: health,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(isHealthy ? 200 : 503).json(response);
});

router.get('/ready', async (req: Request, res: Response) => {
  const db = DatabaseConnection.getInstance();
  const mongoConnection = db.getMongoConnection();
  const redisClient = db.getRedisClient();

  try {
    // Test MongoDB connection
    if (mongoConnection?.connection.readyState === 1) {
      await mongoConnection.connection.db?.admin().ping();
    }

    // Test Redis connection
    if (redisClient?.isOpen) {
      await redisClient.ping();
    }

    const response: ApiResponse = {
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'ServiceNotReady',
        message: 'One or more services are not ready',
      },
    };

    res.status(503).json(response);
  }
});

router.get('/live', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };

  res.json(response);
});

export default router;
