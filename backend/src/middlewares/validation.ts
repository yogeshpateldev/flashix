import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    req.query = value;
    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      return next(createError(message, 400));
    }

    req.params = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required',
    }),
  }),

  fileUpload: Joi.object({
    visibility: Joi.string().valid('public', 'private', 'password').default('public'),
    password: Joi.string().when('visibility', {
      is: 'password',
      then: Joi.required().messages({
        'any.required': 'Password is required for password-protected files',
      }),
      otherwise: Joi.forbidden(),
    }),
    maxDownloads: Joi.number().integer().min(1).max(1000).optional(),
    expiryHours: Joi.number().min(0.1).max(168).optional(),
  }),

  fileUpdate: Joi.object({
    visibility: Joi.string().valid('public', 'private', 'password').optional(),
    password: Joi.string().when('visibility', {
      is: 'password',
      then: Joi.required().messages({
        'any.required': 'Password is required for password-protected files',
      }),
      otherwise: Joi.optional(),
    }),
    maxDownloads: Joi.number().integer().min(1).max(1000).optional(),
    expiryHours: Joi.number().integer().min(1).max(168).optional(),
  }),

  fileAccess: Joi.object({
    password: Joi.string().optional(),
    accessCode: Joi.string().length(6).pattern(/^[A-Z0-9]+$/).optional(),
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('createdAt', '-createdAt', 'size', '-size', 'downloadCount', '-downloadCount', 'expiresAt', '-expiresAt').default('-createdAt'),
    search: Joi.string().max(100).optional(),
  }),

  fileId: Joi.object({
    fileId: Joi.string().required().messages({
      'any.required': 'File ID is required',
    }),
  }),

  sessionId: Joi.object({
    sessionId: Joi.string().required().messages({
      'any.required': 'Session ID is required',
    }),
  }),

  sessionClaim: Joi.object({
    sessionId: Joi.string().required().messages({
      'any.required': 'Session ID is required',
    }),
    userId: Joi.string().optional(),
  }),
};
