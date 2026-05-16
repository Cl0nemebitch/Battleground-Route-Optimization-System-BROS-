from __future__ import annotations

import heapq
from dataclasses import dataclass, field
from typing import Optional

from app.graph.battlefield import BattlefieldGraph
from app.algorithms.astar import astar
from app.models import AgentSpec


@dataclass(order=True)
class CBSNode:
    cost: float
    constraints: dict[str, set[tuple[str, int]]] = field(compare=False)
    paths: dict[str, list[str]] = field(compare=False)


def cbs(
    graph: BattlefieldGraph,
    agents: list[AgentSpec],
    max_iterations: int = 500,
) -> tuple[dict[str, list[str]], float, int]:
    """
    Conflict-Based Search for multi-agent pathfinding on a graph.
    Time is discretized by hop index along each path.
    """
    root_paths: dict[str, list[str]] = {}
    total = 0.0

    for agent in agents:
        path, cost, _ = astar(graph, agent.start, agent.goal)
        if path is None:
            return {}, float("inf"), 0
        root_paths[agent.id] = path
        total += cost

    open_list: list[CBSNode] = [CBSNode(cost=total, constraints={}, paths=root_paths)]
    conflicts_resolved = 0
    iterations = 0

    while open_list and iterations < max_iterations:
        iterations += 1
        node = heapq.heappop(open_list)

        conflict = _find_conflict(node.paths)
        if conflict is None:
            return node.paths, node.cost, conflicts_resolved

        conflicts_resolved += 1
        agent_a, agent_b, location, timestep = conflict

        for constrained_agent in (agent_a, agent_b):
            new_constraints = {k: set(v) for k, v in node.constraints.items()}
            new_constraints.setdefault(constrained_agent, set()).add((location, timestep))

            new_paths: dict[str, list[str]] = {}
            new_cost = 0.0
            failed = False

            for spec in agents:
                path, cost, _ = _constrained_astar(
                    graph, spec.start, spec.goal, new_constraints.get(spec.id, set())
                )
                if path is None:
                    failed = True
                    break
                new_paths[spec.id] = path
                new_cost += cost

            if not failed:
                heapq.heappush(
                    open_list,
                    CBSNode(cost=new_cost, constraints=new_constraints, paths=new_paths),
                )

    return root_paths, total, conflicts_resolved


def _find_conflict(
    paths: dict[str, list[str]],
) -> Optional[tuple[str, str, str, int]]:
    agents = list(paths.keys())
    max_len = max(len(p) for p in paths.values())

    for t in range(max_len):
        positions: dict[str, str] = {}
        for aid, path in paths.items():
            idx = min(t, len(path) - 1)
            positions[aid] = path[idx]

        # Vertex conflict
        by_loc: dict[str, list[str]] = {}
        for aid, loc in positions.items():
            by_loc.setdefault(loc, []).append(aid)
        for loc, aids in by_loc.items():
            if len(aids) > 1:
                return aids[0], aids[1], loc, t

        # Edge swap conflict
        if t > 0:
            prev: dict[str, str] = {}
            for aid, path in paths.items():
                idx = min(t - 1, len(path) - 1)
                prev[aid] = path[idx]
            for i, a in enumerate(agents):
                for b in agents[i + 1 :]:
                    if positions[a] == prev[b] and positions[b] == prev[a] and positions[a] != positions[b]:
                        return a, b, positions[a], t

    return None


def _constrained_astar(
    graph: BattlefieldGraph,
    start: str,
    goal: str,
    constraints: set[tuple[str, int]],
) -> tuple[Optional[list[str]], float, int]:
    if start not in graph.nodes or goal not in graph.nodes:
        return None, float("inf"), 0

    open_set: list[tuple[float, str, int]] = [(0.0, start, 0)]
    came_from: dict[tuple[str, int], tuple[str, int]] = {}
    g_score: dict[tuple[str, int], float] = {(start, 0): 0.0}
    expanded = 0

    while open_set:
        _, current, t = heapq.heappop(open_set)
        expanded += 1

        if current == goal:
            path = [current]
            ct = t
            while (current, ct) in came_from:
                current, ct = came_from[(current, ct)]
                path.append(current)
            path.reverse()
            return path, g_score[(path[-1], ct)], expanded

        for neighbor, cost, _ in graph.neighbors(current):
            nt = t + 1
            if (neighbor, nt) in constraints:
                continue
            tentative = g_score[(current, t)] + cost
            key = (neighbor, nt)
            if tentative < g_score.get(key, float("inf")):
                came_from[key] = (current, t)
                g_score[key] = tentative
                f = tentative + graph.heuristic(neighbor, goal)
                heapq.heappush(open_set, (f, neighbor, nt))

    return None, float("inf"), expanded
