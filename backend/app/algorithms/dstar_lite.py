from __future__ import annotations

from typing import Optional

from app.graph.battlefield import BattlefieldGraph
from app.algorithms.astar import astar


def dstar_lite_replan(
    graph: BattlefieldGraph,
    start: str,
    goal: str,
    previous_path: list[str],
    threat_updates: list[tuple[str, float]],
) -> tuple[Optional[list[str]], float, int, bool]:
    """
    Simplified D* Lite: apply threat updates, then replan.
    If the previous path remains valid under new costs, reuse it; otherwise A*.
    """
    for node_id, threat in threat_updates:
        graph.update_threat(node_id, threat)

    if previous_path and _path_valid(graph, previous_path):
        cost = sum(
            next(c for n, c, _ in graph.neighbors(previous_path[i]) if n == previous_path[i + 1])
            for i in range(len(previous_path) - 1)
        )
        return previous_path, cost, 0, True

    path, cost, expanded = astar(graph, start, goal)
    return path, cost, expanded, False


def _path_valid(graph: BattlefieldGraph, path: list[str]) -> bool:
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        if not any(n == v for n, _, _ in graph.neighbors(u)):
            return False
    return True
