import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import { v4 as uuidv4 } from 'uuid';

// Augment Express Request to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

import config from './config';
import logger from './utils/logger';
import DatabaseConnection from './utils/database';

import authRoutes from './routes/auth';
import fileRoutes from './routes/files';
import sessionRoutes from './routes/sessions';
import adminRoutes from './routes/admin';
import healthRoutes from './routes/health';
import metricsRoutes from './routes/metrics';

import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { requestLogger } from './middlewares/requestLogger';
import { setupRateLimiting } from './middlewares/rateLimit';

class App {
  public app: Application;
  private database: DatabaseConnection;

  constructor() {
    this.app = express();
    this.database = DatabaseConnection.getInstance();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.set('trust proxy', config.headers.trustProxy);

    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: config.headers.forceHttps ? undefined : false,
    }));

    this.app.use(cors({
      origin: (origin: any, callback: any) => {
        if (!origin || config.cors.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-ID'],
    }));

    this.app.use(compression());
    this.app.use(cookieParser(config.security.sessionSecret));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.app.use(mongoSanitize());
    this.app.use(xss());
    this.app.use(hpp());

    this.app.use((req: Request, res: Response, next: NextFunction) => {
      req.requestId = uuidv4();
      next();
    });

    this.app.use(requestLogger);

    setupRateLimiting(this.app);
  }

  private initializeRoutes(): void {
    this.app.use('/api/v1/health', healthRoutes);
    this.app.use('/api/v1/auth', authRoutes);
    this.app.use('/api/v1/files', fileRoutes);
    this.app.use('/api/v1/sessions', sessionRoutes);
    this.app.use('/api/v1/admin', adminRoutes);
    this.app.use('/metrics', metricsRoutes);

    // Short link redirect
    this.app.get('/f/:fileId', (req: Request, res: Response, next: NextFunction) => {
      try {
        const { fileId } = req.params;
        res.redirect(`/api/v1/files/${fileId}/download`);
      } catch (error) {
        next(error);
      }
    });

    this.app.get('/', (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json({
          message: 'Flashix API - Ephemeral File Sharing Platform',
          version: '1.0.0',
          status: 'running',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        next(error);
      }
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(notFound);
    this.app.use(errorHandler);
  }

  public async connectDatabase(): Promise<void> {
    await this.database.connectMongoDB();
    await this.database.connectRedis();
  }

  public async disconnectDatabase(): Promise<void> {
    await this.database.disconnectAll();
  }

  public getApp(): Application {
    return this.app;
  }
}

export default App;
