import type { BattlefieldMap, CostWeights, RouteResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }
  return res.json();
}

export async function fetchPreset(): Promise<BattlefieldMap> {
  const res = await fetch(`${API_BASE}/api/preset`);
  if (!res.ok) throw new Error("Failed to load preset map");
  return res.json();
}

export function runAstar(
  map: BattlefieldMap,
  start: string,
  goal: string,
  weights: CostWeights
): Promise<RouteResponse> {
  return post("/api/route/astar", { map, start, goal, weights });
}
