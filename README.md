# BROS — Battlefield Route Optimization System

A full-stack DAA project that finds safe, efficient routes through a battlefield graph — with **A\***, **D\* Lite** (dynamic threats), and **CBS** (multi-agent, collision-free).

**Live demo:** deploy frontend via GitHub Pages and backend via Render (see below).

## Features

- **Hybrid graph map** — nodes (locations) + weighted edges (distance, terrain, threat, civilian risk δ)
- **A\*** — optimal static path from start to objective
- **D\* Lite** — replan when threat spikes at runtime (demo: node B1)
- **CBS** — two soldiers, conflict-free paths
- **Ethical cost knob** — increase δ to avoid high civilian-risk zones

## Stack

| Layer    | Tech                          |
|----------|-------------------------------|
| Frontend | React 19, Vite, TypeScript, Tailwind |
| Backend  | Python 3.12, FastAPI, Pydantic |
| Deploy   | Docker, GitHub Pages, Render  |

## Local development

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to port 8000.

### Docker (single container)

```bash
docker compose up --build
```

Open [http://localhost:8000](http://localhost:8000) — API + built UI together.

## Deploy from GitHub

### 1. Backend on Render (free tier)

1. Push this repo to GitHub.
2. [Render](https://render.com) → **New Web Service** → connect repo.
3. Use **Docker** and `render.yaml`, or set Dockerfile path to `./Dockerfile`.
4. After deploy, copy your URL (e.g. `https://bros-api.onrender.com`).

### 2. Frontend on GitHub Pages

1. Repo **Settings → Pages → Build and deployment → GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**:
   - `VITE_API_URL` = your Render URL (no trailing slash)
3. Push to `main` — workflow `.github/workflows/deploy-pages.yml` publishes the site.

Site URL: `https://<username>.github.io/<repo-name>/`

> **Note:** GitHub Pages serves static files only. The Python API must run on Render (or similar). For a single URL, use Docker on Render/Fly and skip Pages.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/preset` | Demo battlefield map |
| POST | `/api/route/astar` | A* routing |
| POST | `/api/route/dynamic` | D* Lite replan |
| POST | `/api/route/multi-agent` | CBS multi-agent |

## Cost model

Edge cost: `α·distance + β·threat + γ·terrain + δ·civilian`

Tune sliders in the UI to compare **fast but dangerous** vs **safer, civilian-aware** routes.

## Project structure

```
BROS/
├── backend/app/
│   ├── algorithms/   # astar, dstar_lite, cbs
│   ├── graph/        # BattlefieldGraph + costs
│   └── main.py       # FastAPI
├── frontend/src/     # React UI
├── Dockerfile
└── README.md
```

## License

MIT — academic / portfolio use.
