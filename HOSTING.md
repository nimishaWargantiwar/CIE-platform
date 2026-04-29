# Hosting Guide (Testing Branch)

This guide prepares and deploys the CIE Platform for production-style hosting from the testing branch.

## 1. What is now hosting-ready

- Production compose file: `docker-compose.prod.yml`
- Frontend API base URL override: `frontend/.env.example` + `VITE_API_BASE_URL`
- Hardened Nginx config with security headers and `/healthz`
- Backend health endpoint already available at `/api/health`

## 2. Server prerequisites

- Docker Engine + Docker Compose plugin
- A Linux VM/server with ports 80 and 443 open
- Domain name pointed to server public IP

## 3. Branch and files

```bash
git checkout testing
git pull origin testing
```

Create environment files:

```bash
cp .env.production.example .env
cp backend/.env.production.example backend/.env
cp frontend/.env.example frontend/.env
```

## 4. Required environment edits

Edit `.env` (root):

- `MONGO_USER`
- `MONGO_PASS`
- `FRONTEND_PORT` (usually `80`)

Edit `backend/.env`:

- `NODE_ENV=production`
- `JWT_SECRET` set to a long random value (32+ chars)
- `JWT_REFRESH_SECRET` set to a different long random value
- `ADMIN_PASSWORD` set to a secure password
- `CORS_ORIGIN=https://your-domain.com`
- `AI_PROVIDER` and API key values (Gemini/OpenAI/Groq)

Edit `frontend/.env`:

- Keep `VITE_API_BASE_URL=/api` when frontend and backend are on same domain through Nginx
- Use full URL only if backend is hosted separately

## 5. Build and run in production mode

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

Check status:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend
```

## 6. Seed admin user (first deployment only)

```bash
docker exec pict-cie-backend node utils/seed.js
```

## 7. Health checks

- Frontend container: `http://your-domain/healthz`
- Backend API: `http://your-domain/api/health`

## 8. HTTPS (recommended)

Use any one:

1. Cloudflare proxy with Full SSL
2. Nginx/Caddy reverse proxy on host with Let's Encrypt certificates

If you place another reverse proxy in front, map frontend to a non-privileged port in `.env` (for example `FRONTEND_PORT=8080`) and proxy incoming 443 traffic to that port.

## 9. Update workflow

```bash
git checkout testing
git pull origin testing
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

## 10. Rollback (quick)

```bash
git checkout <previous-working-commit>
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```
