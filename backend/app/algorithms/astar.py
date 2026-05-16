from __future__ import annotations

import heapq
from typing import Optional

from app.graph.battlefield import BattlefieldGraph


def astar(
    graph: BattlefieldGraph,
    start: str,
    goal: str,
) -> tuple[Optional[list[str]], float, int]:
    if start not in graph.nodes or goal not in graph.nodes:
        return None, float("inf"), 0

    open_set: list[tuple[float, str]] = [(0.0, start)]
    came_from: dict[str, str] = {}
    g_score: dict[str, float] = {start: 0.0}
    expanded = 0

    while open_set:
        _, current = heapq.heappop(open_set)
        expanded += 1

        if current == goal:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            path.reverse()
            return path, g_score[goal], expanded

        for neighbor, cost, _ in graph.neighbors(current):
            tentative = g_score[current] + cost
            if tentative < g_score.get(neighbor, float("inf")):
                came_from[neighbor] = current
                g_score[neighbor] = tentative
                f = tentative + graph.heuristic(neighbor, goal)
                heapq.heappush(open_set, (f, neighbor))

    return None, float("inf"), expanded
