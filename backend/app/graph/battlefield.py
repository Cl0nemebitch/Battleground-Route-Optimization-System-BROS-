from __future__ import annotations

import math
from collections import defaultdict

from app.models import BattlefieldMap, CostWeights, Edge, Node, TerrainType

TERRAIN_MULTIPLIER: dict[TerrainType, float] = {
    TerrainType.OPEN: 1.0,
    TerrainType.ROUGH: 1.8,
    TerrainType.URBAN: 2.2,
    TerrainType.WATER: 4.0,
}


class BattlefieldGraph:
    def __init__(self, battlefield: BattlefieldMap, weights: CostWeights):
        self.weights = weights
        self.nodes: dict[str, Node] = {n.id: n for n in battlefield.nodes}
        self.adj: dict[str, list[tuple[str, float, dict[str, float]]]] = defaultdict(list)
        # Store original edge distances so _rebuild_edges can reuse them
        self._edge_distances: dict[tuple[str, str], float] = {}

        edge_set: set[tuple[str, str]] = set()
        for edge in battlefield.edges:
            edge_set.add((edge.source, edge.target))
            edge_set.add((edge.target, edge.source))

        for source, target in edge_set:
            if source not in self.nodes or target not in self.nodes:
                continue
            dist = edge_distance(source, target, battlefield)
            self._edge_distances[(source, target)] = dist
            self._edge_distances[(target, source)] = dist
            cost, breakdown = self._edge_cost(source, target, dist)
            self.adj[source].append((target, cost, breakdown))

    def neighbors(self, node_id: str) -> list[tuple[str, float, dict[str, float]]]:
        return self.adj.get(node_id, [])

    def heuristic(self, a: str, b: str) -> float:
        na, nb = self.nodes[a], self.nodes[b]
        dist = math.hypot(na.x - nb.x, na.y - nb.y)
        return self.weights.alpha * dist

    def _edge_cost(self, u: str, v: str, distance: float) -> tuple[float, dict[str, float]]:
        nu, nv = self.nodes[u], self.nodes[v]
        dist_cost = self.weights.alpha * distance
        threat_cost = self.weights.beta * (nu.threat + nv.threat) / 2
        terrain_cost = self.weights.gamma * (
            TERRAIN_MULTIPLIER[nu.terrain] + TERRAIN_MULTIPLIER[nv.terrain]
        ) / 2
        civilian_cost = self.weights.delta * (nu.civilian_risk + nv.civilian_risk) / 2
        total = dist_cost + threat_cost + terrain_cost + civilian_cost
        return total, {
            "distance": dist_cost,
            "threat": threat_cost,
            "terrain": terrain_cost,
            "civilian": civilian_cost,
        }

    def path_breakdown(self, path: list[str]) -> dict[str, float]:
        totals = {"distance": 0.0, "threat": 0.0, "terrain": 0.0, "civilian": 0.0, "total": 0.0}
        for i in range(len(path) - 1):
            u, v = path[i], path[i + 1]
            for neighbor, cost, breakdown in self.neighbors(u):
                if neighbor == v:
                    for key in ("distance", "threat", "terrain", "civilian"):
                        totals[key] += breakdown[key]
                    totals["total"] += cost
                    break
        return totals

    def update_threat(self, node_id: str, threat: float) -> None:
        if node_id in self.nodes:
            self.nodes[node_id].threat = threat
            self._rebuild_edges()

    def _rebuild_edges(self) -> None:
        old_adj = dict(self.adj)
        self.adj = defaultdict(list)
        seen: set[tuple[str, str]] = set()
        for source, entries in old_adj.items():
            for target, _, _ in entries:
                pair = (min(source, target), max(source, target))
                if pair in seen:
                    continue
                seen.add(pair)
                # Reuse stored original distance — do NOT recalculate Euclidean
                # because the original edge may have had a custom distance value
                dist = self._edge_distances.get((source, target),
                    math.hypot(self.nodes[source].x - self.nodes[target].x,
                               self.nodes[source].y - self.nodes[target].y))
                cost_s, bd_s = self._edge_cost(source, target, dist)
                cost_t, bd_t = self._edge_cost(target, source, dist)
                self.adj[source].append((target, cost_s, bd_s))
                self.adj[target].append((source, cost_t, bd_t))


def edge_distance(source: str, target: str, battlefield: BattlefieldMap) -> float:
    nodes = {n.id: n for n in battlefield.nodes}
    for edge in battlefield.edges:
        if {edge.source, edge.target} == {source, target} and edge.distance is not None:
            return edge.distance
    ns, nt = nodes[source], nodes[target]
    return math.hypot(ns.x - nt.x, ns.y - nt.y)
