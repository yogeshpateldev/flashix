import { Router, Response, Request } from 'express';
import { getMetrics } from '../utils/metrics';
import { ApiResponse } from '../types';
import { authenticate, authorize } from '../middlewares/auth';

const router = Router();

// Prometheus metrics endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'MetricsError',
        message: 'Failed to retrieve metrics',
      },
    };
    
    res.status(500).json(response);
  }
});

// Metrics dashboard (admin only)
router.get('/dashboard',
  authenticate,
  authorize('admin'),
  async (req: Request, res: Response) => {
    try {
      const { getMetricValues } = await import('../utils/metrics.js');
      const metricValues = await getMetricValues();
      
      const response: ApiResponse = {
        success: true,
        data: {
          metrics: metricValues,
          timestamp: new Date().toISOString(),
        },
      };
      
      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MetricsError',
          message: 'Failed to retrieve metric dashboard',
        },
      };
      
      res.status(500).json(response);
    }
  }
);

export default router;
