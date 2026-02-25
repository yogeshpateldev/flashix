import jwt from 'jsonwebtoken';
import { User } from '../models';
import { JwtPayload } from '../types';
import config from '../config';
import { createError } from '../middlewares/errorHandler';

export class AuthService {
  static generateTokens(user: any) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'access',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15 minutes
    };

    const refreshPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
    const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

    return { accessToken, refreshToken };
  }

  static async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      
      if (decoded.type !== 'access') {
        throw createError('Invalid token type', 401);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid access token', 401);
      }
      throw error;
    }
  }

  static async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
      
      if (decoded.type !== 'refresh') {
        throw createError('Invalid token type', 401);
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw createError('Invalid refresh token', 401);
      }
      throw error;
    }
  }

  static async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      throw createError('User not found', 404);
    }

    // Keep only last 5 refresh tokens
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push(refreshToken);
    await user.save();
  }

  static async removeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      throw createError('User not found', 404);
    }

    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    await user.save();
  }

  static async removeAllRefreshTokens(userId: string): Promise<void> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      throw createError('User not found', 404);
    }

    user.refreshTokens = [];
    await user.save();
  }

  static async validateRefreshToken(userId: string, refreshToken: string): Promise<boolean> {
    const user = await User.findById(userId).select('+refreshTokens');
    if (!user) {
      return false;
    }

    return user.refreshTokens.includes(refreshToken);
  }

  static async createUser(email: string, password: string) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError('User with this email already exists', 409);
    }

    const user = new User({ email, password });
    await user.save();

    return user;
  }

  static async authenticateUser(email: string, password: string) {
    const user = await User.findOne({ email }).select('+password +refreshTokens');
    if (!user) {
      throw createError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw createError('Invalid email or password', 401);
    }

    return user;
  }
}
