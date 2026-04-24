# S3-Like File Sharing Application with Docker

A complete Docker-based file sharing platform with S3-compatible storage, user authentication, and a modern web interface.

## Local Development Mode

For faster day-to-day development, run only infrastructure in Docker and keep the app on your machine:

- PostgreSQL in Docker
- MinIO in Docker
- Backend in VS Code with `npm run dev`
- Frontend in VS Code with `npm start`

Use [`LOCAL_DEV.md`](F:\Video\s3-file-sharing-app\LOCAL_DEV.md) and:

```bash
docker compose -f docker-compose.dev-infra.yml up -d
```

## 🚀 Features

- **User Authentication**: Secure registration and login with JWT tokens
- **File Upload & Download**: Upload files up to 500MB
- **S3-Compatible Storage**: Using MinIO for object storage
- **File Sharing**: Share files with other users
- **Database**: PostgreSQL for user and metadata management
- **Modern UI**: React-based dashboard with beautiful design
- **REST API**: Express.js backend with comprehensive endpoints
- **Containerized**: Complete Docker setup with docker-compose

## 📋 Prerequisites

- Docker (v20.10+)
- Docker Compose (v1.29+)

## 🏁 Getting Started

### 1. Clone or Extract the Project

```bash
cd s3-file-sharing-app
```

### 2. Configure Environment Variables

The `.env` file is already configured with defaults. For production, update:

```bash
# Edit .env file
DB_PASSWORD=your_secure_password
MINIO_ROOT_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
```

### 3. Start the Application

```bash
# Build and start all services
docker compose up -d --build

# Or with output visible
docker compose up --build

# View logs
docker compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **MinIO Console**: http://localhost:9001
- **Nginx (Reverse Proxy)**: http://localhost

### 5. Create Account

1. Go to http://localhost
2. Click "Register"
3. Fill in username, email, and password
4. Click "Register"
5. Login with your credentials

## 📁 Project Structure

```
s3-file-sharing-app/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── config/            # Database and MinIO configuration
│   │   ├── controllers/       # Business logic
│   │   ├── middleware/        # Authentication middleware
│   │   ├── routes/            # API endpoints
│   │   └── index.js           # Main entry point
│   ├── scripts/
│   │   └── init.sql           # Database initialization
│   ├── package.json
│   └── Dockerfile
├── frontend/                   # React Application
│   ├── src/
│   │   ├── pages/             # Page components (Login, Register, Dashboard)
│   │   ├── services/          # API service calls
│   │   ├── styles/            # CSS styles
│   │   ├── App.js             # Main component
│   │   └── index.js           # React entry point
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── package.json
│   └── Dockerfile
├── nginx/
│   └── nginx.conf             # Reverse proxy configuration
├── docker-compose.yml         # Docker Compose configuration
├── .env                       # Environment variables
└── README.md                  # This file
```

## 🔌 API Endpoints

### Authentication

- **POST** `/api/auth/register` - Register new user
- **POST** `/api/auth/login` - Login user
- **GET** `/api/auth/profile` - Get user profile (requires auth)

### Files

- **POST** `/api/files/upload` - Upload a file (requires auth)
- **GET** `/api/files/list` - List user's files (requires auth)
- **GET** `/api/files/download/:fileId` - Download a file (requires auth)
- **DELETE** `/api/files/:fileId` - Delete a file (requires auth)
- **POST** `/api/files/:fileId/share` - Share file with user (requires auth)
- **GET** `/api/files/shared/list` - Get files shared with user (requires auth)

## 🗄️ Database Schema

### Users Table
```sql
- id (PRIMARY KEY)
- username (UNIQUE)
- email (UNIQUE)
- password_hash
- created_at
- updated_at
```

### Files Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY → users)
- file_name
- minio_key
- file_size
- mime_type
- is_public
- created_at
- updated_at
```

### Shared Files Table
```sql
- id (PRIMARY KEY)
- file_id (FOREIGN KEY → files)
- shared_with_user_id (FOREIGN KEY → users)
- access_level (view/download/edit)
- created_at
- expires_at
```

## 🐳 Docker Services

1. **PostgreSQL (postgres)**: Database server on the internal Docker network
2. **MinIO (minio)**: S3-compatible storage on ports 9000 (API) & 9001 (Console)
3. **Backend (backend)**: Express API on internal port 3000
4. **Frontend (frontend)**: React app served on internal port 80
5. **Nginx (nginx)**: Reverse proxy on port 80

## 🛠️ Common Commands

```bash
# Start services in background
docker compose up -d --build

# View logs
docker compose logs -f [service-name]

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v

# Rebuild services
docker compose up -d --build

# Scale stateless services
docker compose up -d --scale backend=2 --scale frontend=2

# Access PostgreSQL CLI
docker compose exec postgres psql -U fileadmin -d filesharingdb

# Access MinIO CLI
docker compose exec minio /bin/sh
```

## 🔐 Security Considerations

- JWT tokens expire after 7 days
- Passwords are hashed with bcryptjs
- Rate limiting enabled (100 requests per 15 minutes)
- HTTPS support ready (configure SSL in nginx.conf)
- File size limit: 500MB
- CORS enabled for API

## 📝 Default Credentials

### Database
- Username: `fileadmin`
- Password: `fileadmin123`
- Database: `filesharingdb`

### MinIO
- Access Key: `minioadmin`
- Secret Key: `minioadmin123`

**⚠️ IMPORTANT: Change these credentials in production!**

## 🚀 Production Deployment

1. Update `.env` with strong credentials
2. Generate secure JWT_SECRET:
   ```bash
   openssl rand -hex 32
   ```
3. Configure SSL certificates in nginx
4. Set `NODE_ENV=production`
5. Use environment-specific configurations
6. Set up backup for PostgreSQL and MinIO
7. Configure CI/CD pipeline

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is provided as-is for educational and commercial use.

## 📧 Support

For issues or questions, check the logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

---

**Made with ❤️ using Docker, Node.js, React, and PostgreSQL**
