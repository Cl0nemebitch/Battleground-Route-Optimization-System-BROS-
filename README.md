# BROS — Battlefield Route Optimization System

Interactive battlefield routing with **A\*** — graph map, threat/terrain/civilian costs.

**Live site:** https://cl0nemebitch.github.io/Battleground-Route-Optimization-System-BROS/

## Pages not loading?

1. **Settings → Pages → Source** must be **GitHub Actions** (not “Deploy from a branch”).
2. Run **Actions → Deploy to GitHub Pages** and wait for a green checkmark.
3. Open the full URL above (repo name ends with `-`).

## Local dev

```bash
# Terminal 1 — API
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI
cd frontend && npm install && npm run dev
```

Open http://localhost:5173
