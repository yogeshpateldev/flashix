import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { Application } from 'express';
import config from '../config';
import DatabaseConnection from '../utils/database';

export const setupRateLimiting = (app: Application): void => {
  const db = DatabaseConnection.getInstance();
  const redisClient = db.getRedisClient();

  const makeStore = () => redisClient ? new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }) : undefined;

  // General rate limiter for all requests
  const generalLimiter = rateLimit({
    store: makeStore(),
    windowMs: config.rateLimit.windowMs,
    max: 1000,
    message: {
      success: false,
      error: {
        code: 'TooManyRequests',
        message: 'Too many requests from this IP, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Anonymous user rate limiter (stricter)
  const anonymousLimiter = rateLimit({
    store: makeStore(),
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxAnon,
    keyGenerator: (req) => {
      return `anon:${req.ip}:${(req as any).requestId}`;
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
  });

  // Authenticated user rate limiter (more lenient)
  const authLimiter = rateLimit({
    store: makeStore(),
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxUser,
    keyGenerator: (req) => {
      const user = (req as any).user;
      return user ? `auth:${user._id}` : `anon:${req.ip}`;
    },
    skip: (req) => {
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
  });

  // Upload rate limiter (very strict)
  const uploadLimiter = rateLimit({
    store: makeStore(),
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
  });

  // Apply rate limiters
  app.use('/api/v1/', generalLimiter);
  app.use('/api/v1/files/upload', uploadLimiter);

  // Auth routes get special treatment
  app.use('/api/v1/auth/login', rateLimit({
    store: makeStore(),
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    message: {
      success: false,
      error: {
        code: 'TooManyLoginAttempts',
        message: 'Too many login attempts, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/api/v1/auth/register', rateLimit({
    store: makeStore(),
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      error: {
        code: 'TooManyRegistrations',
        message: 'Too many registration attempts, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }));
};
