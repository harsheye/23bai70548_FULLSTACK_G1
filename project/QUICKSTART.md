# Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Verify Docker Installation
```powershell
docker --version
docker-compose --version
```

### Step 2: Start the Application
```powershell
# Navigate to project directory
cd s3-file-sharing-app

# Start all services
docker-compose up -d

# Wait 30-60 seconds for services to be ready
```

### Step 3: Access the Application
- **Frontend**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin123)
- **API**: http://localhost:3000/api

### Step 4: Create an Account
1. Click "Register" on the login page
2. Fill in your details:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Register"
4. Login with your credentials

### Step 5: Upload and Share Files
1. Go to "My Files" tab
2. Click file input to select a file
3. File will upload automatically
4. Click "Share" to share with other users
5. Enter recipient's email address

## 🛠️ Useful VS Code Tasks

In VS Code, press `Ctrl+Shift+P` and search for "Run Task":

- **Docker: Start All Services** - Starts all containers
- **Docker: Stop All Services** - Stops all containers
- **Docker: View Backend Logs** - Stream backend logs
- **Docker: View Frontend Logs** - Stream frontend logs
- **Docker: Build and Start** - Rebuild and start all services

## 📊 Service Status

Check if services are running:
```powershell
docker-compose ps

# Should show:
# NAME                  STATUS
# file-sharing-db       Up
# file-sharing-storage  Up
# file-sharing-api      Up
# file-sharing-web      Up
# file-sharing-proxy    Up
```

## 🔧 Troubleshooting

### Services won't start
```powershell
# Check logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Port already in use
```powershell
# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different ports in docker-compose.yml
```

### Database connection error
```powershell
# Wait 30 seconds for database to initialize
# Then restart backend
docker-compose restart backend
```

### File upload fails
- Check file size (max 500MB)
- Ensure MinIO is running: `docker-compose ps`
- Check backend logs: `docker-compose logs backend`

## 📚 Feature Demo

### 1. User Authentication
```bash
# Register
POST http://localhost:3000/api/auth/register
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "password123"
}

# Login
POST http://localhost:3000/api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

### 2. File Operations
```bash
# Upload file (requires token)
POST http://localhost:3000/api/files/upload
Headers: Authorization: Bearer <token>
Body: form-data with "file" field

# List files
GET http://localhost:3000/api/files/list
Headers: Authorization: Bearer <token>

# Download file
GET http://localhost:3000/api/files/download/<fileId>
Headers: Authorization: Bearer <token>

# Share file
POST http://localhost:3000/api/files/<fileId>/share
Headers: Authorization: Bearer <token>
{
  "email": "otheruser@example.com",
  "accessLevel": "view"
}
```

## 💾 Database Access

```powershell
# Connect to PostgreSQL
docker-compose exec postgres psql -U fileadmin -d filesharingdb

# Useful queries
SELECT * FROM users;
SELECT * FROM files;
SELECT * FROM shared_files;

# Exit psql
\q
```

## 📦 MinIO Access

```powershell
# Access MinIO console
# URL: http://localhost:9001
# Username: minioadmin
# Password: minioadmin123

# Or use MinIO CLI
docker-compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin123
docker-compose exec minio mc ls local/file-sharing/
```

## 🎯 Next Steps

1. **Customize the UI**: Edit files in `frontend/src/styles/`
2. **Add more features**: Extend API in `backend/src/routes/`
3. **Configure SSL**: Set up HTTPS in `nginx/nginx.conf`
4. **Deploy to cloud**: Use docker-compose for AWS ECS, Kubernetes, etc.

## 📞 Support

All services have health checks. If something isn't working:

```powershell
# Full logs
docker-compose logs

# Specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Restart a service
docker-compose restart backend

# Clean rebuild
docker-compose down -v
docker-compose up -d --build
```

## 🎉 You're Ready!

Your S3-like file sharing application is now running. Start by:
1. Creating an account
2. Uploading some files
3. Sharing files with other users
4. Exploring the MinIO console

Happy file sharing! 🚀
