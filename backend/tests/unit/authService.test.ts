import { AuthService } from '@/services/authService';
import { User } from '@/models';
import { createError } from '@/middlewares/errorHandler';

// Mock dependencies
jest.mock('@/models');
jest.mock('@/middlewares/errorHandler');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens for a user', () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'user',
      };

      const tokens = AuthService.generateTokens(mockUser);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const mockUser = { ...userData, _id: 'user123', save: jest.fn() };
      (User.findOne as jest.Mock).mockResolvedValue(null);
      (User as any).mockImplementation(() => mockUser);

      const result = await AuthService.createUser(userData.email, userData.password);

      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(result).toBe(mockUser);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      (User.findOne as jest.Mock).mockResolvedValue({ _id: 'existing' });
      (createError as jest.Mock).mockReturnValue(new Error('User exists'));

      await expect(AuthService.createUser(userData.email, userData.password))
        .rejects.toThrow('User exists');

      expect(createError).toHaveBeenCalledWith('User with this email already exists', 409);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Test123!@#',
      };

      const mockUser = {
        _id: 'user123',
        email: userData.email,
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.authenticateUser(userData.email, userData.password);

      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(userData.password);
      expect(result).toBe(mockUser);
    });

    it('should throw error for invalid credentials', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (createError as jest.Mock).mockReturnValue(new Error('Invalid credentials'));

      await expect(AuthService.authenticateUser(userData.email, userData.password))
        .rejects.toThrow('Invalid credentials');

      expect(createError).toHaveBeenCalledWith('Invalid email or password', 401);
    });

    it('should throw error for wrong password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        _id: 'user123',
        email: userData.email,
        comparePassword: jest.fn().mockResolvedValue(false),
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (createError as jest.Mock).mockReturnValue(new Error('Invalid credentials'));

      await expect(AuthService.authenticateUser(userData.email, userData.password))
        .rejects.toThrow('Invalid credentials');

      expect(createError).toHaveBeenCalledWith('Invalid email or password', 401);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'user',
      };

      const { accessToken } = AuthService.generateTokens(mockUser);

      const result = await AuthService.verifyAccessToken(accessToken);

      expect(result.sub).toBe(mockUser._id);
      expect(result.email).toBe(mockUser.email);
      expect(result.role).toBe(mockUser.role);
      expect(result.type).toBe('access');
    });

    it('should throw error for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      (createError as jest.Mock).mockReturnValue(new Error('Invalid token'));

      await expect(AuthService.verifyAccessToken(invalidToken))
        .rejects.toThrow('Invalid token');

      expect(createError).toHaveBeenCalledWith('Invalid access token', 401);
    });

    it('should throw error for refresh token used as access token', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'user',
      };

      const { refreshToken } = AuthService.generateTokens(mockUser);

      (createError as jest.Mock).mockReturnValue(new Error('Invalid token type'));

      await expect(AuthService.verifyAccessToken(refreshToken))
        .rejects.toThrow('Invalid token type');

      expect(createError).toHaveBeenCalledWith('Invalid token type', 401);
    });
  });

  describe('saveRefreshToken', () => {
    it('should save refresh token for user', async () => {
      const userId = 'user123';
      const refreshToken = 'refresh.token.here';

      const mockUser = {
        _id: userId,
        refreshTokens: [],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.saveRefreshToken(userId, refreshToken);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.refreshTokens).toContain(refreshToken);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should limit refresh tokens to 5', async () => {
      const userId = 'user123';
      const refreshToken = 'new.refresh.token';

      const mockUser = {
        _id: userId,
        refreshTokens: ['token1', 'token2', 'token3', 'token4', 'token5'],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.saveRefreshToken(userId, refreshToken);

      expect(mockUser.refreshTokens).toHaveLength(5);
      expect(mockUser.refreshTokens).not.toContain('token1');
      expect(mockUser.refreshTokens).toContain(refreshToken);
    });
  });

  describe('removeRefreshToken', () => {
    it('should remove specific refresh token', async () => {
      const userId = 'user123';
      const refreshToken = 'token.to.remove';

      const mockUser = {
        _id: userId,
        refreshTokens: ['token1', refreshToken, 'token3'],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.removeRefreshToken(userId, refreshToken);

      expect(mockUser.refreshTokens).not.toContain(refreshToken);
      expect(mockUser.refreshTokens).toHaveLength(2);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('removeAllRefreshTokens', () => {
    it('should remove all refresh tokens for user', async () => {
      const userId = 'user123';

      const mockUser = {
        _id: userId,
        refreshTokens: ['token1', 'token2', 'token3'],
        save: jest.fn().mockResolvedValue(true),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await AuthService.removeAllRefreshTokens(userId);

      expect(mockUser.refreshTokens).toHaveLength(0);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid refresh token', async () => {
      const userId = 'user123';
      const refreshToken = 'valid.refresh.token';

      const mockUser = {
        _id: userId,
        refreshTokens: [refreshToken],
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(true);
    });

    it('should return false for invalid refresh token', async () => {
      const userId = 'user123';
      const refreshToken = 'invalid.refresh.token';

      const mockUser = {
        _id: userId,
        refreshTokens: ['other.token'],
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const result = await AuthService.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const userId = 'nonexistent';
      const refreshToken = 'any.token';

      (User.findById as jest.Mock).mockResolvedValue(null);

      const result = await AuthService.validateRefreshToken(userId, refreshToken);

      expect(result).toBe(false);
    });
  });
});
