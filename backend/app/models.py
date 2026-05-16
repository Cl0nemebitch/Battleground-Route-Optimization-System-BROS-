from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class TerrainType(str, Enum):
    OPEN = "open"
    ROUGH = "rough"
    URBAN = "urban"
    WATER = "water"


class Node(BaseModel):
    id: str
    x: float
    y: float
    threat: float = Field(0.0, ge=0.0, le=1.0)
    civilian_risk: float = Field(0.0, ge=0.0, le=1.0)
    terrain: TerrainType = TerrainType.OPEN


class Edge(BaseModel):
    source: str
    target: str
    distance: Optional[float] = None


class CostWeights(BaseModel):
    alpha: float = Field(1.0, ge=0.0, description="Distance weight")
    beta: float = Field(2.0, ge=0.0, description="Threat weight")
    gamma: float = Field(1.5, ge=0.0, description="Terrain weight")
    delta: float = Field(3.0, ge=0.0, description="Civilian risk weight")


class BattlefieldMap(BaseModel):
    nodes: list[Node]
    edges: list[Edge]


class RouteRequest(BaseModel):
    map: BattlefieldMap
    start: str
    goal: str
    weights: CostWeights = CostWeights()


class ThreatUpdate(BaseModel):
    node_id: str
    threat: float = Field(..., ge=0.0, le=1.0)


class DynamicRouteRequest(BaseModel):
    map: BattlefieldMap
    start: str
    goal: str
    weights: CostWeights = CostWeights()
    previous_path: list[str] = []
    threat_updates: list[ThreatUpdate] = []


class AgentSpec(BaseModel):
    id: str
    start: str
    goal: str


class MultiAgentRequest(BaseModel):
    map: BattlefieldMap
    agents: list[AgentSpec]
    weights: CostWeights = CostWeights()


class RouteResponse(BaseModel):
    path: list[str]
    cost: float
    breakdown: dict[str, float]
    algorithm: str
    expanded_nodes: int = 0


class MultiAgentResponse(BaseModel):
    paths: dict[str, list[str]]
    total_cost: float
    algorithm: str
    conflicts_resolved: int = 0
