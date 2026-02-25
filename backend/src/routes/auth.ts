import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import { AuthenticatedRequest, ApiResponse, JwtPayload } from '../types';
import config from '../config';
import { validate, schemas } from '../middlewares/validation';
import { asyncHandler, createError } from '../middlewares/errorHandler';

const router = Router();

const generateTokens = (user: any) => {
  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  const refreshToken = jwt.sign(refreshPayload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });

  return { accessToken, refreshToken };
};

router.post('/register', validate(schemas.register), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw createError('User with this email already exists', 409);
  }

  // Create new user
  const user = new User({ email, password });
  await user.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token
  user.refreshTokens.push(refreshToken);
  await user.save();

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(201).json(response);
}));

router.post('/login', validate(schemas.login), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(user);

  // Save refresh token (limit to 5 tokens per user)
  user.refreshTokens = user.refreshTokens.slice(-4); // Keep last 4 tokens
  user.refreshTokens.push(refreshToken);
  await user.save();

  const response: ApiResponse = {
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken,
      refreshToken,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
}));

router.post('/refresh', validate(schemas.refreshToken), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
    
    if (decoded.type !== 'refresh') {
      throw createError('Invalid token type', 401);
    }

    // Find user
    const user = await User.findById(decoded.sub).select('+refreshTokens');
    if (!user) {
      throw createError('User not found', 401);
    }

    // Check if refresh token exists for this user
    if (!user.refreshTokens.includes(refreshToken)) {
      // Token might be compromised, remove all refresh tokens
      user.refreshTokens = [];
      await user.save();
      throw createError('Invalid refresh token', 401);
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh tokens
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    res.json(response);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw createError('Invalid refresh token', 401);
    }
    throw error;
  }
}));

router.post('/logout', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  const refreshToken = req.body.refreshToken;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await User.findById(decoded.sub).select('+refreshTokens');
      
      if (user) {
        // Remove specific refresh token if provided
        if (refreshToken) {
          user.refreshTokens = user.refreshTokens.filter((token: string) => token !== refreshToken);
        } else {
          // Remove all tokens if no specific token provided
          user.refreshTokens = [];
        }
        await user.save();
      }
    } catch (error) {
      // Token might be expired, but we still want to logout
    }
  }

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Logged out successfully',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
}));

router.post('/logout-all', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
      const user = await User.findById(decoded.sub).select('+refreshTokens');
      
      if (user) {
        user.refreshTokens = [];
        await user.save();
      }
    } catch (error) {
      // Token might be expired, but we still want to logout
    }
  }

  const response: ApiResponse = {
    success: true,
    data: {
      message: 'Logged out from all devices successfully',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.json(response);
}));

export default router;
