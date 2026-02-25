# Flashix Backend - Production-Grade Ephemeral File Sharing Platform

Production-grade Node.js/TypeScript backend for the Flashix ephemeral file-sharing platform with hybrid authentication, comprehensive security, and scalability features.

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev

# Start worker (separate terminal)
npm run worker

# Or use Docker
npm run docker:run
```

## 📋 Features

- ✅ **Hybrid Authentication**: Anonymous sessions + JWT-based user accounts
- ✅ **File Management**: Upload/download with Cloudinary integration
- ✅ **Security**: Rate limiting, input validation, CORS protection
- ✅ **Background Jobs**: BullMQ for file cleanup and processing
- ✅ **Monitoring**: Winston logging + Prometheus metrics
- ✅ **Testing**: Jest with unit and integration tests
- ✅ **Docker**: Multi-stage builds and docker-compose setup
- ✅ **CI/CD**: GitHub Actions pipeline

## 🛠 Tech Stack

- **Node.js** + **TypeScript**
- **Express.js** framework
- **MongoDB** + **Mongoose** ODM
- **Redis** for caching and sessions
- **BullMQ** for background job processing
- **Cloudinary** for file storage
- **JWT** for authentication
- **Winston** for logging
- **Prometheus** for metrics
- **Docker** for containerization

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          ← Environment configuration
│   ├── models/          ← Mongoose schemas
│   ├── routes/          ← API endpoints
│   ├── services/        ← Business logic
│   ├── middlewares/     ← Security and validation
│   ├── utils/           ← Utilities and helpers
│   ├── jobs/            ← Background jobs
│   ├── types/           ← TypeScript definitions
│   ├── app.ts           ← Express application
│   ├── server.ts        ← Server entry point
│   └── worker.ts        ← Worker entry point
├── tests/               ← Test files
├── docs/                ← API documentation
├── .github/workflows/   ← CI/CD pipeline
├── docker-compose.yml   ← Development environment
├── Dockerfile           ← Production deployment
└── package.json         ← Dependencies and scripts
```

## 🔧 Environment Variables

See `.env.example` for all required environment variables:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/flashix
REDIS_URL=redis://localhost:6379

# Cloudinary (get from cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_minimum_32_characters
```

## 📚 API Documentation

See [API Examples](./docs/api-examples.md) for detailed usage examples.

### Main Endpoints

- **Authentication**: `/api/v1/auth/*`
- **Files**: `/api/v1/files/*`
- **Sessions**: `/api/v1/sessions/*`
- **Admin**: `/api/v1/admin/*`
- **Health**: `/api/v1/health`
- **Metrics**: `/metrics`


## 🐳 Docker

```bash
# Development environment
npm run docker:run

# Production build
docker build -t flashix-backend .

# Run production container
docker run -p 3000:3000 --env-file .env flashix-backend
```

## 📊 Monitoring

- **Health Check**: `GET /api/v1/health`
- **Metrics**: `GET /metrics` (Prometheus format)
- **Logs**: Winston structured logging
- **Dashboard**: `GET /metrics/dashboard` (admin only)

## 🔒 Security Features

- JWT access and refresh tokens
- Rate limiting with Redis store
- Input validation with Joi
- CORS protection
- Security headers (Helmet)
- NoSQL injection prevention
- XSS and parameter pollution protection

## 🚀 Deployment

### Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start

# Start worker
npm run worker:prod
```

## 📈 Performance

- **Connection Pooling**: MongoDB connection pool
- **Caching**: Redis for sessions and rate limiting
- **File Streaming**: Direct uploads to Cloudinary
- **Background Processing**: BullMQ for async tasks
- **Compression**: Gzip response compression

## 🛠 Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Lint code
npm run lint

# Format code
npm run format

# Type check
npm run typecheck

# Build
npm run build
```

## 📝 License

MIT License - see LICENSE file for details.


### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout (revoke refresh token)

### Files
- `POST /api/v1/files/upload` - Upload file (anonymous/authenticated)
- `GET /api/v1/files/:fileId` - Get file metadata
- `GET /api/v1/files/:fileId/download` - Download file
- `POST /api/v1/files/:fileId/extend` - Extend expiration (auth only)
- `DELETE /api/v1/files/:fileId` - Delete file

### Sessions
- `POST /api/v1/sessions/create` - Create anonymous session
- `GET /api/v1/sessions/:sessionId/files` - List session files
- `POST /api/v1/sessions/:sessionId/claim` - Claim/transfer session

### Admin
- `GET /api/v1/admin/files` - List all files (admin only)
- `GET /api/v1/admin/users` - List users (admin only)
- `GET /api/v1/admin/stats` - System statistics (admin only)

### Health
- `GET /api/v1/health` - Health check endpoint
- `GET /metrics` - Prometheus metrics

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Linting
npm run lint

# Type checking
npm run typecheck
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
