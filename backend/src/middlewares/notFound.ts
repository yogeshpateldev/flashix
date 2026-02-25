import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: 'NotFound',
      message: `Route ${req.originalUrl} not found`,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  res.status(404).json(response);
};
