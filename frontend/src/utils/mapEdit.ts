import type { BattlefieldMap, Node } from "../types";

export function edgeKey(a: string, b: string): string {
  return [a, b].sort().join("--");
}

export function hasEdge(map: BattlefieldMap, a: string, b: string): boolean {
  const k = edgeKey(a, b);
  return map.edges.some((e) => edgeKey(e.source, e.target) === k);
}

export function toggleEdge(map: BattlefieldMap, a: string, b: string): BattlefieldMap {
  if (a === b) return map;
  const k = edgeKey(a, b);
  const exists = map.edges.some((e) => edgeKey(e.source, e.target) === k);
  return {
    ...map,
    edges: exists
      ? map.edges.filter((e) => edgeKey(e.source, e.target) !== k)
      : [...map.edges, { source: a, target: b }],
  };
}

export function nextNodeId(nodes: Node[]): string {
  let i = nodes.length + 1;
  while (nodes.some((n) => n.id === `N${i}`)) i += 1;
  return `N${i}`;
}

export function addNode(map: BattlefieldMap, x: number, y: number): BattlefieldMap {
  const id = nextNodeId(map.nodes);
  const node: Node = {
    id,
    x,
    y,
    threat: 0.2,
    civilian_risk: 0.1,
    terrain: "open",
  };
  return { ...map, nodes: [...map.nodes, node] };
}

export function removeNode(map: BattlefieldMap, id: string): BattlefieldMap {
  return {
    nodes: map.nodes.filter((n) => n.id !== id),
    edges: map.edges.filter((e) => e.source !== id && e.target !== id),
  };
}

export function updateNode(
  map: BattlefieldMap,
  id: string,
  patch: Partial<Node>
): BattlefieldMap {
  return {
    ...map,
    nodes: map.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
  };
}

export function moveNode(
  map: BattlefieldMap,
  id: string,
  x: number,
  y: number
): BattlefieldMap {
  return updateNode(map, id, { x, y });
}
