# Shipping With Docker

## 1. Prepare Secrets

Copy `.env.example` to `.env` and replace at least:

- `DB_PASSWORD`
- `MINIO_ROOT_PASSWORD`
- `JWT_SECRET`

## 2. Build And Start

```bash
docker compose up -d --build
```

## 3. Endpoints

- App: `http://localhost`
- API: `http://localhost/api`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## 4. Persistent Volumes

The production stack stores state in named Docker volumes:

- `s3_file_sharing_postgres_data`
- `s3_file_sharing_minio_data`

## 5. Scale Stateless Services

```bash
docker compose up -d --build --scale backend=2 --scale frontend=2
```

The top-level `nginx` proxy talks to Docker DNS, so you can scale `backend` and `frontend` without editing the proxy config.

## 6. Useful Commands

```bash
docker compose ps
docker compose logs -f nginx backend frontend
docker compose down
docker compose down -v
```

## Notes

- PostgreSQL is internal-only in the production compose file and is not published on the host.
- The public app is exposed through the top-level `nginx` service on port `80`.
- The frontend is built for production and served by Nginx in the `frontend` container.
- `/api` stays on the same origin, so the shipped app does not need a separate public API hostname.
