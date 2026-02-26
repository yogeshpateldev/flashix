import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createClient } from 'redis';

let mongoServer: MongoMemoryServer;
let redisClient: ReturnType<typeof createClient>;

beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Override environment variables for testing
  process.env.MONGO_URI = mongoUri;
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test_jwt_secret_minimum_32_characters';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_minimum_32_characters';
  process.env.SESSION_SECRET = 'test_session_secret_minimum_32_characters';
  
  // Connect to test database
  await mongoose.connect(mongoUri);

  // Start Redis Memory Server (if needed for tests)
  redisClient = createClient({
    url: 'redis://localhost:6379',
  });
  
  try {
    await redisClient.connect();
  } catch (error) {
    console.warn('Redis not available for tests, some features may be limited');
  }

  // Mock Cloudinary for all tests
  const cloudinary = require('cloudinary').v2;
  
  cloudinary.uploader.upload = jest.fn().mockResolvedValue({
    public_id: 'test/test-file-123',
    secure_url: 'https://cloudinary.com/test/test-file-123',
    bytes: 1024,
    format: 'txt',
  });

  cloudinary.uploader.destroy = jest.fn().mockResolvedValue({
    result: 'ok',
  });

  cloudinary.url = jest.fn().mockReturnValue('https://cloudinary.com/test/test-file-123');
});

afterAll(async () => {
  // Clean up database connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }

  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
});

afterEach(async () => {
  // Clean up collections after each test
  if (mongoose.connection.readyState === 1) { // Connected
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      try {
        await collection.deleteMany({});
      } catch (error) {
        console.warn(`Failed to clean up collection ${key}:`, error);
      }
    }
  }

  // Clean up Redis data if available
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.flushDb();
    } catch (error) {
      console.warn('Failed to flush Redis data:', error);
    }
  }
});

// Global test utilities
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const User = require('@/models').User;
    const defaultUser = {
      email: 'test@example.com',
      password: 'Test123!@#',
      role: 'user',
      ...userData,
    };
    
    const user = new User(defaultUser);
    return await user.save();
  },

  createTestSession: async (sessionData = {}) => {
    const Session = require('@/models').Session;
    const defaultSession = {
      sessionId: 'test-session-123',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...sessionData,
    };
    
    const session = new Session(defaultSession);
    return await session.save();
  },

  createTestFile: async (fileData = {}) => {
    const File = require('@/models').File;
    const defaultFile = {
      fileId: 'test-file-123',
      originalName: 'test-file.txt',
      cloudinaryPublicId: 'test/test-file-123',
      cloudinaryUrl: 'https://cloudinary.com/test/test-file-123',
      size: 1024,
      mimeType: 'text/plain',
      visibility: 'public',
      downloadCount: 0,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ownerType: 'anonymous',
      sessionId: 'test-session-123',
      meta: {
        checksum: 'test-checksum',
        virusScanStatus: 'clean',
        accessCode: 'TEST123',
      },
      ...fileData,
    };
    
    const file = new File(defaultFile);
    return await file.save();
  },

  generateTestToken: (userId: string, role = 'user') => {
    const jwt = require('jsonwebtoken');
    const config = require('@/config').config;
    
    return jwt.sign(
      {
        sub: userId,
        email: 'test@example.com',
        role,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (15 * 60),
      },
      config.jwt.secret
    );
  },

  generateTestRefreshToken: (userId: string, role = 'user') => {
    const jwt = require('jsonwebtoken');
    const config = require('@/config').config;
    
    return jwt.sign(
      {
        sub: userId,
        email: 'test@example.com',
        role,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      },
      config.jwt.refreshSecret
    );
  },

  mockCloudinary: () => {
    const cloudinary = require('cloudinary').v2;
    
    cloudinary.uploader.upload = jest.fn().mockResolvedValue({
      public_id: 'test/test-file-123',
      secure_url: 'https://cloudinary.com/test/test-file-123',
      bytes: 1024,
      format: 'txt',
    });

    cloudinary.uploader.destroy = jest.fn().mockResolvedValue({
      result: 'ok',
    });

    cloudinary.url = jest.fn().mockReturnValue('https://cloudinary.com/test/test-file-123');
  },

  restoreCloudinary: () => {
    jest.restoreAllMocks();
  },
};

declare global {
  namespace globalThis {
    var testUtils: {
      createTestUser: (userData?: any) => Promise<any>;
      createTestSession: (sessionData?: any) => Promise<any>;
      createTestFile: (fileData?: any) => Promise<any>;
      generateTestToken: (userId: string, role?: string) => string;
      generateTestRefreshToken: (userId: string, role?: string) => string;
      mockCloudinary: () => void;
      restoreCloudinary: () => void;
    };
  }
}
