import request from 'supertest';
import { App } from '@/app';
import { User } from '@/models';
import config from '@/config';

describe('Authentication Endpoints', () => {
  let app: App;

  beforeAll(async () => {
    app = new App();
    await app.connectDatabase();
  });

  afterAll(async () => {
    await app.disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean up users before each test
    await User.deleteMany({});
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.role).toBe('user');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Verify user was created in database
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.email).toBe(userData.email);
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      // Create user first
      await global.testUtils.createTestUser({ email: userData.email });

      const response = await request(app.getApp())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Conflict');
    });

    it('should return error for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Test123!@#',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('email');
    });

    it('should return error for weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('password');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Test123!@#',
      });
    });

    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });

    it('should return error for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getApp())
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user and get refresh token
      const user = await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

      refreshToken = global.testUtils.generateTestRefreshToken(user._id);
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });

    it('should return error for access token used as refresh token', async () => {
      const user = await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

      const accessToken = global.testUtils.generateTestToken(user._id);

      const response = await request(app.getApp())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create a test user and get tokens
      const user = await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

      accessToken = global.testUtils.generateTestToken(user._id);
      refreshToken = global.testUtils.generateTestRefreshToken(user._id);
    });

    it('should logout successfully with refresh token', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should logout successfully without refresh token', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should return error without access token', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });
  });

  describe('POST /api/v1/auth/logout-all', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create a test user and get access token
      const user = await global.testUtils.createTestUser({
        email: 'test@example.com',
        password: 'Test123!@#',
      });

      accessToken = global.testUtils.generateTestToken(user._id);
    });

    it('should logout from all devices successfully', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out from all devices successfully');
    });

    it('should return error without access token', async () => {
      const response = await request(app.getApp())
        .post('/api/v1/auth/logout-all')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make 6 failed login attempts (limit is 5 per 15 minutes)
      for (let i = 0; i < 6; i++) {
        const expectedStatus = i < 5 ? 401 : 429;
        await request(app.getApp())
          .post('/api/v1/auth/login')
          .send(loginData)
          .expect(expectedStatus);
      }
    });

    it('should rate limit registration attempts', async () => {
      const userData = {
        email: `test${Date.now()}@example.com`,
        password: 'Test123!@#',
      };

      // Make 4 registration attempts (limit is 3 per hour)
      for (let i = 0; i < 4; i++) {
        const expectedStatus = i < 3 ? 201 : 429;
        await request(app.getApp())
          .post('/api/v1/auth/register')
          .send({ ...userData, email: `test${i}-${Date.now()}@example.com` })
          .expect(expectedStatus);
      }
    });
  });
});
