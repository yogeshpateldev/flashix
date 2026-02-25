import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { Application } from 'express';
import config from '../config';
import DatabaseConnection from '../utils/database';

export const setupRateLimiting = (app: Application): void => {
  const db = DatabaseConnection.getInstance();
  const redisClient = db.getRedisClient();
  const trustProxy = config.security?.trustProxy || false;

  // General rate limiter for all requests
  const generalLimiter = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: config.rateLimit.windowMs,
    max: 1000, // General limit
    message: {
      success: false,
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests from this IP, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy,
  });

  // Anonymous user rate limiter (stricter)
  const anonymousLimiter = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxAnon,
    keyGenerator: (req) => {
      return `anon:${req.ip}:${req.requestId}`;
    },
    message: {
      success: false,
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests for anonymous users, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy,
  });

  // Authenticated user rate limiter (more lenient)
  const authLimiter = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxUser,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `auth:${user._id}` : `anon:${req.ip}`;
    },
    skip: (req) => {
      // Skip if user is authenticated (handled by authLimiter)
      return !!(req as any).user;
    },
    message: {
      success: false,
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy,
  });

  // Upload rate limiter (very strict)
  const uploadLimiter = rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxUpload,
    keyGenerator: (req) => {
      const user = (req as any).user;
      const sessionId = (req as any).sessionId;
      return user ? `upload:auth:${user._id}` : sessionId ? `upload:session:${sessionId}` : `upload:ip:${req.ip}`;
    },
    message: {
      success: false,
      error: {
        code: 'TooManyUploads',
        message: 'Too many upload attempts, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    trustProxy,
  });

  // Apply rate limiters
  app.use('/api/v1/', generalLimiter);
  app.use('/api/v1/files/upload', uploadLimiter);
  
  // Auth routes get special treatment
  app.use('/api/v1/auth/login', rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    skipSuccessfulRequests: true,
    message: {
      success: false,
      error: {
        code: 'TooManyLoginAttempts',
        message: 'Too many login attempts, please try again later',
      },
    },
    trustProxy,
  }));

  app.use('/api/v1/auth/register', rateLimit({
    store: redisClient ? new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) : undefined,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    message: {
      success: false,
      error: {
        code: 'TooManyRegistrations',
        message: 'Too many registration attempts, please try again later',
      },
    },
    trustProxy,
  }));
};
