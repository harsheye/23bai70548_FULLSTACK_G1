# Local Development

This setup is optimized for day-to-day development:

- Run infrastructure in Docker: PostgreSQL and MinIO
- Run application code locally in VS Code: backend and frontend
- Keep fast reload for both apps

## Architecture

```text
Browser -> Frontend (local, port 3001 or 3000)
Frontend -> Backend API (local, port 3000)
Backend -> PostgreSQL (Docker, port 5432)
Backend -> MinIO (Docker, port 9000)
MinIO Console -> http://localhost:9001
```

## Files

- `docker-compose.dev-infra.yml`: Docker services for PostgreSQL and MinIO only
- `backend/.env.example`: local backend environment template
- `frontend/.env.development.local.example`: local frontend environment template

## 1. Start Infrastructure

```bash
docker compose -f docker-compose.dev-infra.yml up -d
```

## 2. Backend Setup

Create `backend/.env` from `backend/.env.example`.

Expected values:

```env
NODE_ENV=development
API_PORT=3000
JWT_SECRET=your_jwt_secret_key_change_in_production
DB_HOST=localhost
DB_PORT=5432
DB_USER=fileadmin
DB_PASSWORD=fileadmin123
DB_NAME=filesharingdb
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_SSL=false
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
```

Run locally:

```bash
cd backend
npm install
npm run dev
```

Backend URL:

```text
http://localhost:3000/api
```

## 3. Frontend Setup

Create `frontend/.env.development.local` from `frontend/.env.development.local.example`.

Expected value:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

Run locally:

```bash
cd frontend
npm install
npm start
```

Frontend URL:

```text
http://localhost:3001
```

If your React dev server opens on port 3000 instead, accept the next available port prompt or free port 3000 first.

## 4. Recommended Development Structure

```text
s3-file-sharing-app/
|-- docker-compose.dev-infra.yml
|-- backend/
|   |-- .env
|   |-- src/
|   |-- scripts/
|   `-- package.json
|-- frontend/
|   |-- .env.development.local
|   |-- src/
|   `-- package.json
`-- nginx/   # keep for container/proxy deployments, not needed for daily local dev
```

## Useful Commands

```bash
docker compose -f docker-compose.dev-infra.yml up -d
docker compose -f docker-compose.dev-infra.yml down
docker compose -f docker-compose.dev-infra.yml logs -f postgres
docker compose -f docker-compose.dev-infra.yml logs -f minio
```
