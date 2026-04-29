# PICT CIE Platform — Commands to Run the Project

## Prerequisites

- **Node.js** 20+
- **npm** (comes with Node.js)
- **Docker Desktop** (for MongoDB)
- **Git** (optional, for cloning)

---

## 1. Start Docker Desktop

Open Docker Desktop from the Start Menu, or run:

```powershell
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

Wait until Docker is fully started (system tray icon stops animating).

---

## 2. Start MongoDB (via Docker Compose)

```bash
cd pict-cie-platform
docker-compose up -d mongodb
```

This starts a MongoDB 7 container on port `27017` with credentials:
- **Username:** `admin`
- **Password:** `secret`

---

## 3. Configure Environment Variables

### Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your values. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://admin:secret@localhost:27017/pict_cie?authSource=admin` | MongoDB connection string (use `localhost` for local dev) |
| `JWT_SECRET` | `your_jwt_secret_key_...` | Change for production |
| `CORS_ORIGIN` | `http://localhost:3000` | Frontend URL |
| `AI_PROVIDER` | `openai` | `openai` or `gemini` |
| `OPENAI_API_KEY` | — | Your OpenAI API key |
| `GEMINI_API_KEY` | — | Your Gemini API key |
| `ADMIN_EMAIL` | `admin@pict.edu` | Admin seed email |
| `ADMIN_PASSWORD` | `Admin@123` | Admin seed password |

---

## 4. Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

---

## 5. Seed the Database (Admin User)

```bash
cd backend
node utils/seed.js
```

This creates the default admin user:
- **Email:** `admin@pict.edu`
- **Password:** `Admin@123`

---

## 6. Run the Application (Development Mode)

### Terminal 1 — Backend

```bash
cd backend
npm run dev
```

Backend runs on **http://localhost:5000**

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## 7. Open the App

Go to **http://localhost:3000** in your browser.

Login with:
- **Email:** `admin@pict.edu`
- **Password:** `Admin@123`

---

## Alternative: Run Everything with Docker Compose

To run the entire stack (MongoDB + Backend + Frontend) using Docker:

```bash
cd pict-cie-platform
cp .env.example .env          # Root .env for MongoDB credentials
cp backend/.env.example backend/.env  # Backend config

# Build and start all services
docker-compose up --build -d
```

App will be available at **http://localhost** (port 80).

---

## Useful Commands

### Stop all Docker containers

```bash
docker-compose down
```

### Stop and remove volumes (wipes database)

```bash
docker-compose down -v
```

### View backend logs

```bash
docker-compose logs -f backend
```

### View MongoDB logs

```bash
docker-compose logs -f mongodb
```

### Check running containers

```bash
docker ps
```

### Re-seed the database

```bash
cd backend
node utils/seed.js
```

### Build frontend for production

```bash
cd frontend
npm run build
```

### Preview production build

```bash
cd frontend
npm run preview
```

---

## Port Summary

| Service  | Port  | URL                    |
|----------|-------|------------------------|
| Frontend | 3000  | http://localhost:3000   |
| Backend  | 5000  | http://localhost:5000   |
| MongoDB  | 27017 | mongodb://localhost:27017 |
| Docker (prod) | 80 | http://localhost      |

---

## Troubleshooting

### MongoDB connection refused
- Make sure Docker Desktop is running
- Run `docker-compose up -d mongodb`
- Verify with: `docker ps --filter "name=mongo"`

### Backend won't start
- Check `backend/.env` exists and `MONGO_URI` points to `localhost:27017` (not `mongodb:27017` — that's for Docker networking)
- Run `npm install` in the backend folder

### Frontend proxy errors
- Make sure the backend is running on port 5000 first
- Check `vite.config.js` proxy points to `http://localhost:5000`

### Port already in use
```bash
# Find process on port 5000 (PowerShell)
Get-NetTCPConnection -LocalPort 5000 | Select-Object OwningProcess
taskkill /PID <process_id> /F

# Find process on port 3000
Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
taskkill /PID <process_id> /F
```
