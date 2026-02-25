import * as dotenv from 'dotenv';
import * as Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  // Database
  MONGO_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  CLOUDINARY_API_SENTRY_DSN: Joi.string().optional().allow(''),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: Joi.number().min(10).max(15).default(12),
  SESSION_SECRET: Joi.string().min(32).required(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_ANON: Joi.number().default(20),
  RATE_LIMIT_MAX_USER: Joi.number().default(100),
  RATE_LIMIT_MAX_UPLOAD: Joi.number().default(5),

  // File Upload
  MAX_UPLOAD_SIZE: Joi.number().default(104857600), // 100MB
  ALLOWED_MIME_TYPES: Joi.string()
    .default('image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'),

  // Monitoring
  SENTRY_DSN: Joi.string().optional().allow(''),
  PROMETHEUS_PORT: Joi.number().default(9090),

  // CORS
  ALLOWED_ORIGINS: Joi.string()
    .default('http://localhost:3000,http://localhost:5173,http://localhost:8080'),

  // Worker
  BULLMQ_REDIS_URL: Joi.string().default('redis://localhost:6379'),
  WORKER_CONCURRENCY: Joi.number().default(10),

  // File Expiration
  DEFAULT_EXPIRY_HOURS: Joi.number().default(24),
  MAX_EXPIRY_HOURS: Joi.number().default(168),

  // Security Headers
  TRUST_PROXY: Joi.boolean().default(true),
  FORCE_HTTPS: Joi.boolean().default(false),
}).unknown(true);

const { value: envVars, error } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  logLevel: envVars.LOG_LEVEL,

  database: {
    mongo: {
      uri: envVars.MONGO_URI,
    },
    redis: {
      url: envVars.REDIS_URL,
    },
  },

  cloudinary: {
    cloudName: envVars.CLOUDINARY_CLOUD_NAME,
    apiKey: envVars.CLOUDINARY_API_KEY,
    apiSecret: envVars.CLOUDINARY_API_SECRET,
  },

  jwt: {
    secret: envVars.JWT_SECRET,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },

  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    sessionSecret: envVars.SESSION_SECRET,
    trustProxy: envVars.TRUST_PROXY,
  },

  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    maxAnon: envVars.RATE_LIMIT_MAX_ANON,
    maxUser: envVars.RATE_LIMIT_MAX_USER,
    maxUpload: envVars.RATE_LIMIT_MAX_UPLOAD,
  },

  upload: {
    maxSize: envVars.MAX_UPLOAD_SIZE,
    allowedMimeTypes: envVars.ALLOWED_MIME_TYPES.split(','),
  },

  monitoring: {
    sentryDsn: envVars.SENTRY_DSN,
    prometheusPort: envVars.PROMETHEUS_PORT,
  },

  cors: {
    allowedOrigins: envVars.ALLOWED_ORIGINS.split(','),
  },

  worker: {
    redisUrl: envVars.BULLMQ_REDIS_URL,
    concurrency: envVars.WORKER_CONCURRENCY,
  },

  expiration: {
    defaultHours: envVars.DEFAULT_EXPIRY_HOURS,
    maxHours: envVars.MAX_EXPIRY_HOURS,
  },

  headers: {
    trustProxy: envVars.TRUST_PROXY,
    forceHttps: envVars.FORCE_HTTPS,
  },
};

export default config;
