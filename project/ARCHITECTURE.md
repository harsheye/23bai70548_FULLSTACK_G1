# System Architecture

## Overview

This is a microservices-based file sharing platform using Docker containers. Each component is independently scalable and can be deployed separately.

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Reverse Proxy                      │
│                      Port 80 / 443                          │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
      ┌────────▼──────┐  ┌────▼──────┐  ┌──▼──────────┐
      │   Frontend    │  │  Backend   │  │   MinIO    │
      │   React App   │  │   Express  │  │  (S3 API)  │
      │  Port 3001    │  │  Port 3000 │  │ Port 9000  │
      └────────┬──────┘  └────┬───────┘  └──┬────┬────┘
               │              │            │    │
      ┌────────┴──────────────┴────────────┘    │
      │                                         │
      │  ┌─────────────────────────────────────┘
      │  │
   ┌──▼──▼──────────────┐
   │   PostgreSQL DB    │
   │   Port 5432        │
   │  ┌───────────────┐ │
   │  │ users table   │ │
   │  │ files table   │ │
   │  │ shares table  │ │
   │  └───────────────┘ │
   └───────────────────┘

      MinIO Storage
   ┌──────────────────┐
   │ file-sharing     │
   │   ├─ user1/      │
   │   ├─ user2/      │
   │   └─ user3/      │
   └──────────────────┘
```

## Components

### 1. Frontend (React)
- **Port**: 3001 (internally), 80 (via Nginx)
- **Technology**: React 18, React Router, Axios
- **Features**:
  - User authentication (register/login)
  - File upload interface
  - File listing and management
  - File sharing UI
  - Responsive design

### 2. Backend (Express.js)
- **Port**: 3000
- **Technology**: Node.js 18, Express, JWT, bcryptjs
- **Endpoints**:
  - `/api/auth/*` - User authentication
  - `/api/files/*` - File operations
- **Features**:
  - JWT-based authentication
  - File upload/download
  - File sharing management
  - Rate limiting
  - CORS support

### 3. PostgreSQL Database
- **Port**: 5432
- **Technology**: PostgreSQL 15
- **Schema**:
  - users table
  - files table
  - shared_files table
- **Features**:
  - User credentials storage
  - File metadata
  - Sharing permissions

### 4. MinIO (S3 Storage)
- **API Port**: 9000
- **Console Port**: 9001
- **Technology**: MinIO (S3-compatible)
- **Storage**: file-sharing bucket
- **Features**:
  - Object storage
  - Multi-part upload
  - Versioning support

### 5. Nginx (Reverse Proxy)
- **Port**: 80, 443
- **Technology**: Nginx Alpine
- **Features**:
  - Request routing
  - Load balancing
  - SSL/TLS termination (ready)
  - Gzip compression
  - Static file serving

## Data Flow

### 1. User Registration/Login
```
Client → Nginx → Backend
                  ├─ Hash password (bcryptjs)
                  ├─ Store in PostgreSQL
                  └─ Return JWT token
```

### 2. File Upload
```
Client → Nginx → Backend
                  ├─ Verify JWT token
                  ├─ Upload to MinIO
                  ├─ Store metadata in PostgreSQL
                  └─ Return file info
```

### 3. File Download
```
Client → Nginx → Backend
                  ├─ Verify JWT token
                  ├─ Check permissions
                  ├─ Fetch from MinIO
                  └─ Stream to client
```

### 4. File Sharing
```
Client → Nginx → Backend
                  ├─ Verify JWT token
                  ├─ Find target user
                  ├─ Create share record in PostgreSQL
                  └─ Return share info
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Files Table
```sql
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  minio_key VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Shared Files Table
```sql
CREATE TABLE shared_files (
  id SERIAL PRIMARY KEY,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  access_level VARCHAR(50) DEFAULT 'view',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

## Security Architecture

### 1. Authentication
- JWT tokens (7-day expiration)
- Passwords hashed with bcryptjs (10 salt rounds)
- Token stored in localStorage

### 2. Authorization
- Token validation on protected routes
- File ownership verification
- Share permission checks

### 3. Network Security
- Rate limiting (100 requests/15 minutes)
- CORS configuration
- Helmet.js for security headers
- File size limits (500MB)

### 4. Data Protection
- HTTPS ready (configure in nginx.conf)
- Secure password hashing
- SQL injection prevention (parameterized queries)
- XSS protection via React

## Deployment Considerations

### Scaling
```yaml
# Horizontal scaling
docker-compose up -d --scale backend=3

# Load balancing via Nginx
```

### High Availability
- Database replication
- Container orchestration (Kubernetes)
- Distributed file storage
- Load balancer failover

### Monitoring
- Container health checks
- Log aggregation
- Performance metrics
- Error tracking

### Backup Strategy
- PostgreSQL daily backups
- MinIO versioning
- Configuration backups
- Point-in-time recovery

## Performance

### Optimizations
- Gzip compression
- Browser caching (via Nginx)
- MinIO multipart upload
- Connection pooling (PostgreSQL)
- JWT token caching

### Limits
- Max file size: 500MB
- Rate limit: 100 req/15min
- Database connections: 20
- Worker processes: auto

## Environment Variables

```env
# Database
DB_USER=fileadmin
DB_PASSWORD=fileadmin123
DB_NAME=filesharingdb

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# Backend
NODE_ENV=development
JWT_SECRET=secret_key
API_PORT=3000

# Frontend
REACT_APP_API_URL=http://localhost:3000/api
```

## Troubleshooting Checklist

- [ ] All containers running: `docker-compose ps`
- [ ] Ports accessible: `curl http://localhost:3000`
- [ ] Database initialized: `docker-compose logs postgres`
- [ ] Backend health: `docker-compose logs backend`
- [ ] Frontend building: `docker-compose logs frontend`
- [ ] Nginx routing: `docker-compose logs nginx`

---

**Architecture Version**: 1.0
**Last Updated**: March 2026
**Maintainer**: DevOps Team
