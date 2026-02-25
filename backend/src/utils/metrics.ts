import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import logger from '../utils/logger';

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label to all metrics
register.setDefaultLabels({
  app: 'flashix-backend',
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestErrors = new client.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'error_type'],
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
});

const fileUploadsTotal = new client.Counter({
  name: 'file_uploads_total',
  help: 'Total number of file uploads',
  labelNames: ['owner_type', 'visibility', 'status'],
});

const fileDownloadsTotal = new client.Counter({
  name: 'file_downloads_total',
  help: 'Total number of file downloads',
  labelNames: ['visibility', 'status'],
});

const fileSizeBytes = new client.Histogram({
  name: 'file_size_bytes',
  help: 'Size of uploaded files in bytes',
  labelNames: ['mime_type'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600, 1073741824],
});

const databaseConnections = new client.Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['type'],
});

const queueJobs = new client.Gauge({
  name: 'queue_jobs',
  help: 'Number of jobs in queue',
  labelNames: ['queue', 'status'],
});

const cacheOperations = new client.Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(activeConnections);
register.registerMetric(fileUploadsTotal);
register.registerMetric(fileDownloadsTotal);
register.registerMetric(fileSizeBytes);
register.registerMetric(databaseConnections);
register.registerMetric(queueJobs);
register.registerMetric(cacheOperations);

// Middleware to track HTTP requests
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record request duration
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    
    // Record request total
    httpRequestTotal.inc({ method, route, status_code: statusCode });

    // Record errors for non-2xx status codes
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      httpRequestErrors.inc({ method, route, error_type: statusCode.startsWith('4') ? 'client_error' : 'server_error' });
    }

    // Decrement active connections
    activeConnections.dec();
  });

  next();
};

// Helper functions to record custom metrics
export const recordFileUpload = (ownerType: string, visibility: string, status: string, size: number, mimeType: string): void => {
  fileUploadsTotal.inc({ owner_type: ownerType, visibility, status });
  fileSizeBytes.observe({ mime_type: mimeType }, size);
};

export const recordFileDownload = (visibility: string, status: string): void => {
  fileDownloadsTotal.inc({ visibility, status });
};

export const recordDatabaseConnection = (type: string, count: number): void => {
  databaseConnections.set({ type }, count);
};

export const recordQueueJobs = (queue: string, status: string, count: number): void => {
  queueJobs.set({ queue, status }, count);
};

export const recordCacheOperation = (operation: string, status: string): void => {
  cacheOperations.inc({ operation, status });
};

// Get metrics for Prometheus
export const getMetrics = async (): Promise<string> => {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error('Failed to get metrics', { error });
    throw error;
  }
};

// Reset all metrics (useful for testing)
export const resetMetrics = (): void => {
  (register as any).reset();
};

// Get specific metric values
export const getMetricValues = async (): Promise<any> => {
  try {
    const metrics = await register.getMetricsAsJSON();
    return metrics.reduce((acc: any, metric: any) => {
      acc[metric.name] = metric.values;
      return acc;
    }, {});
  } catch (error) {
    logger.error('Failed to get metric values', { error });
    throw error;
  }
};

export { register };
export default {
  metricsMiddleware,
  recordFileUpload,
  recordFileDownload,
  recordDatabaseConnection,
  recordQueueJobs,
  recordCacheOperation,
  getMetrics,
  resetMetrics,
  getMetricValues,
  register,
};
