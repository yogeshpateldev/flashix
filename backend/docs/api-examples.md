# Drop24 API Examples

This document provides practical examples of how to use the Drop24 API endpoints with curl commands and response examples.

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication

### Register New User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "email": "user@example.com",
      "role": "user",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Logout
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Sessions (Anonymous Uploads)

### Create Anonymous Session
```bash
curl -X POST http://localhost:3000/api/v1/sessions/create \
  -c cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "sessionId": "a1b2c3d4e5f6g7h8i9j0k1l2",
      "expiresAt": "2024-01-16T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Session Files
```bash
curl -X GET http://localhost:3000/api/v1/sessions/a1b2c3d4e5f6g7h8i9j0k1l2/files \
  -b cookies.txt
```

## File Operations

### Upload File (Anonymous)
```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -F "file=@/path/to/your/file.pdf" \
  -F "visibility=public" \
  -F "expiryHours=24" \
  -b cookies.txt
```

**Response:**
```json
{
  "success": true,
  "data": {
    "file": {
      "fileId": "x7y8z9a0b1c2d3e4f5g6h7i8",
      "originalName": "document.pdf",
      "size": 2048576,
      "mimeType": "application/pdf",
      "visibility": "public",
      "maxDownloads": null,
      "downloadCount": 0,
      "expiresAt": "2024-01-16T10:30:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "meta": {
        "accessCode": "K9M2X7",
        "virusScanStatus": "clean"
      }
    },
    "downloadUrl": "/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8/download",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "shortLink": "http://localhost:3000/f/x7y8z9a0b1c2d3e4f5g6h7i8"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Upload File (Authenticated)
```bash
curl -X POST http://localhost:3000/api/v1/files/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -F "file=@/path/to/your/image.jpg" \
  -F "visibility=private" \
  -F "password=Secret123!" \
  -F "maxDownloads=5" \
  -F "expiryHours=48"
```

### Get File Metadata
```bash
curl -X GET http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8
```

### Download File (Public)
```bash
curl -X GET http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8/download \
  -L -o downloaded_file.pdf
```

### Download File (Password Protected)
```bash
curl -X GET "http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8/download?password=Secret123!" \
  -L -o downloaded_file.pdf
```

### Download File (Access Code)
```bash
curl -X GET "http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8/download?accessCode=K9M2X7" \
  -L -o downloaded_file.pdf
```

### Update File (Authenticated Only)
```bash
curl -X PUT http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "visibility": "public",
    "expiryHours": 72
  }'
```

### Delete File (Authenticated Only)
```bash
curl -X DELETE http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### List User Files
```bash
curl -X GET "http://localhost:3000/api/v1/files?page=1&limit=10&sort=-createdAt" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get QR Code
```bash
curl -X GET http://localhost:3000/api/v1/files/x7y8z9a0b1c2d3e4f5g6h7i8/qrcode \
  --output qr_code.png
```

## Admin Operations

### Get System Statistics
```bash
curl -X GET http://localhost:3000/api/v1/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### List All Users
```bash
curl -X GET "http://localhost:3000/api/v1/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### List All Files
```bash
curl -X GET "http://localhost:3000/api/v1/admin/files?page=1&limit=20&search=document" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

### Delete User (Admin)
```bash
curl -X DELETE http://localhost:3000/api/v1/admin/users/64f8a1b2c3d4e5f6a7b8c9d0 \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

## Health Check

### Basic Health Check
```bash
curl -X GET http://localhost:3000/api/v1/health
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600.5,
    "version": "1.0.0",
    "environment": "development",
    "services": {
      "database": {
        "status": "connected",
        "readyState": 1
      },
      "redis": {
        "status": "connected"
      }
    },
    "memory": {
      "used": 45.67,
      "total": 128.5,
      "external": 12.3
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Metrics

### Prometheus Metrics
```bash
curl -X GET http://localhost:3000/metrics
```

### Metrics Dashboard (Admin)
```bash
curl -X GET http://localhost:3000/metrics/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE"
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "error": {
    "code": "ValidationError",
    "message": "\"email\" must be a valid email"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "Unauthorized",
    "message": "Access token required"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Forbidden (403)
```json
{
  "success": false,
  "error": {
    "code": "Forbidden",
    "message": "Insufficient permissions"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "NotFound",
    "message": "File not found"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Too Many Requests (429)
```json
{
  "success": false,
  "error": {
    "code": "TooManyRequests",
    "message": "Too many requests from this IP, please try again later"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Rate Limits

- **Anonymous users**: 20 requests per 15 minutes
- **Authenticated users**: 100 requests per 15 minutes  
- **Upload attempts**: 5 per 15 minutes
- **Login attempts**: 5 per 15 minutes
- **Registration attempts**: 3 per hour

## File Size Limits

- **Maximum file size**: 100MB
- **Supported formats**: Images (JPEG, PNG, GIF, WebP), Documents (PDF, DOC, DOCX), Text files

## Security Headers

All API responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HTTPS only)

## CORS

Allowed origins can be configured via `ALLOWED_ORIGINS` environment variable. Default includes:
- `http://localhost:3000`
- `http://localhost:5173`

## Tips

1. **Always use HTTPS in production**
2. **Store refresh tokens securely** (httpOnly cookies recommended)
3. **Handle token expiration gracefully** by implementing refresh token logic
4. **Use the provided QR codes** for easy mobile sharing
5. **Monitor file expiration** to avoid broken links
6. **Implement proper error handling** for network issues
7. **Use the access code feature** for additional security when needed
