# RAG-Based Multi-LLM Personalized Learning and Student Progress Monitoring System

Phase 1 foundation only.

## Current structure

```text
.
├─ backend/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ core/
│  │  ├─ db/
│  │  ├─ schemas/
│  │  └─ main.py
│  ├─ .env
│  ├─ .env.example
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ services/
│  │  ├─ types/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  └─ styles.css
│  ├─ .env
│  ├─ .env.example
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  └─ vite.config.ts
└─ .env.example
```

## Phase 1 scope

- React + TypeScript + Vite frontend
- FastAPI backend
- Environment configuration
- PostgreSQL-ready backend config
- `/health` endpoint
- Frontend health check against the backend through a Vite proxy

## Run locally

### Backend

```powershell
cd "d:\project edu\backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd "d:\project edu\frontend"
npm install
npm run dev
```

## Health check

- Backend: `http://127.0.0.1:8000/health`
- Frontend: `http://localhost:5173`

The frontend calls `GET /api/health`, which is proxied to the backend during development.
