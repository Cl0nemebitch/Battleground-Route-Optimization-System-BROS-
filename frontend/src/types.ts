export type TerrainType = "open" | "rough" | "urban" | "water";

export interface Node {
  id: string;
  x: number;
  y: number;
  threat: number;
  civilian_risk: number;
  terrain: TerrainType;
}

export interface Edge {
  source: string;
  target: string;
  distance?: number;
}

export interface BattlefieldMap {
  nodes: Node[];
  edges: Edge[];
}

export interface CostWeights {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
}

export interface RouteResponse {
  path: string[];
  cost: number;
  breakdown: Record<string, number>;
  algorithm: string;
  expanded_nodes: number;
}
