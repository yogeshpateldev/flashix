import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import config from '../config';
import { ApiResponse } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: number | string;
  path?: string;
  value?: any;
  errors?: any;
  keyValue?: any;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // IMPORTANT: Error objects have non-enumerable properties (message, name,
  // stack, and our custom statusCode / isOperational). Object-spread loses them.
  // Copy explicitly instead.
  let err: AppError = Object.assign(Object.create(Object.getPrototypeOf(error)), error);
  err.message = error.message;
  err.name = error.name;
  err.stack = error.stack;
  err.statusCode = error.statusCode;
  err.isOperational = error.isOperational;

  logger.error('Error occurred:', {
    error: err,
    requestId: (req as any).requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const message = Object.values((error as any).errors || {}).map((val: any) => val.message).join(', ');
    err = {
      name: 'ValidationError',
      statusCode: 400,
      message,
      isOperational: true,
    };
  }

  // Mongoose duplicate key error
  if ((error as any).code === 11000) {
    const field = Object.keys((error as any).keyValue || {})[0];
    const value = (error as any).keyValue?.[field];
    err = {
      name: 'DuplicateFieldError',
      statusCode: 400,
      message: `${field} '${value}' already exists`,
      isOperational: true,
    };
  }

  // Mongoose cast error
  if (error.name === 'CastError') {
    err = {
      name: 'CastError',
      statusCode: 400,
      message: 'Invalid resource ID',
      isOperational: true,
    };
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    err = {
      name: 'JsonWebTokenError',
      statusCode: 401,
      message: 'Invalid token',
      isOperational: true,
    };
  }

  if (error.name === 'TokenExpiredError') {
    err = {
      name: 'TokenExpiredError',
      statusCode: 401,
      message: 'Token expired',
      isOperational: true,
    };
  }

  // Multer errors
  if (error.name === 'MulterError') {
    let message = 'File upload error';
    if (error.message.includes('File too large')) {
      message = `File too large. Maximum size is ${config.upload.maxSize / 1024 / 1024}MB`;
    } else if (error.message.includes('Unexpected field')) {
      message = 'Invalid file field';
    }
    err = {
      name: 'MulterError',
      statusCode: 400,
      message,
      isOperational: true,
    };
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code: err.name || 'InternalServerError',
      message: err.message || 'Internal server error',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (config.env === 'development' && err.stack) {
    response.error!.details = err.stack;
  }

  res.status(err.statusCode || 500).json(response);
};

export const createError = (message: string, statusCode: number = 500): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;

  // Give the error a descriptive name so the `code` field in API responses is human-readable
  const nameMap: Record<number, string> = {
    400: 'BadRequest',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'NotFound',
    409: 'Conflict',
    410: 'Gone',
    422: 'UnprocessableEntity',
    429: 'TooManyRequests',
    500: 'InternalServerError',
  };
  error.name = nameMap[statusCode] || 'AppError';

  return error;
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
