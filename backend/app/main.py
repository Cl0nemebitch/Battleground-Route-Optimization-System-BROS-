from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.algorithms import astar, cbs, dstar_lite_replan
from app.graph.battlefield import BattlefieldGraph
from app.models import (
    DynamicRouteRequest,
    MultiAgentRequest,
    MultiAgentResponse,
    RouteRequest,
    RouteResponse,
)
from app.presets import demo_battlefield

app = FastAPI(
    title="BROS API",
    description="Battlefield Route Optimization System",
    version="1.0.0",
)

origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://*.github.io",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "BROS"}


@app.get("/api/preset")
def get_preset():
    return demo_battlefield()


@app.post("/api/route/astar", response_model=RouteResponse)
def route_astar(req: RouteRequest):
    graph = BattlefieldGraph(req.map, req.weights)
    path, cost, expanded = astar(graph, req.start, req.goal)
    if path is None:
        raise HTTPException(404, "No route found")
    return RouteResponse(
        path=path,
        cost=cost,
        breakdown=graph.path_breakdown(path),
        algorithm="A*",
        expanded_nodes=expanded,
    )


@app.post("/api/route/dynamic", response_model=RouteResponse)
def route_dynamic(req: DynamicRouteRequest):
    graph = BattlefieldGraph(req.map, req.weights)
    updates = [(u.node_id, u.threat) for u in req.threat_updates]
    path, cost, expanded, reused = dstar_lite_replan(
        graph, req.start, req.goal, req.previous_path, updates
    )
    if path is None:
        raise HTTPException(404, "No route found after replan")
    return RouteResponse(
        path=path,
        cost=cost,
        breakdown=graph.path_breakdown(path),
        algorithm="D* Lite (reused path)" if reused else "D* Lite (replanned)",
        expanded_nodes=expanded,
    )


@app.post("/api/route/multi-agent", response_model=MultiAgentResponse)
def route_multi(req: MultiAgentRequest):
    if len(req.agents) < 2:
        raise HTTPException(400, "Multi-agent routing requires at least 2 agents")
    graph = BattlefieldGraph(req.map, req.weights)
    paths, total, conflicts = cbs(graph, req.agents)
    if not paths:
        raise HTTPException(404, "Could not find conflict-free paths")
    return MultiAgentResponse(
        paths=paths,
        total_cost=total,
        algorithm="CBS",
        conflicts_resolved=conflicts,
    )


static_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="frontend")
