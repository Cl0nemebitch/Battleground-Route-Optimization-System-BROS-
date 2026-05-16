import { useCallback, useRef, useState } from "react";
import type { BattlefieldMap, Node } from "../types";
import { addNode, toggleEdge } from "../utils/mapEdit";

export type MapTool = "select" | "add" | "link";

const WIDTH = 800;
const HEIGHT = 480;

interface InteractiveMapProps {
  map: BattlefieldMap;
  path: string[];
  start: string;
  goal: string;
  selectedId: string | null;
  tool: MapTool;
  pickTarget: "start" | "goal" | null;
  onMapChange: (map: BattlefieldMap) => void;
  onSelectNode: (id: string | null) => void;
  onSetStart: (id: string) => void;
  onSetGoal: (id: string) => void;
  onClearPath: () => void;
}

function threatColor(threat: number): string {
  if (threat < 0.3) return "#3d9a6f";
  if (threat < 0.6) return "#d4a24c";
  return "#c45c4a";
}

function nodeRadius(n: Node, role: "start" | "goal" | "none"): number {
  const base = 12 + n.threat * 6 + n.civilian_risk * 3;
  return role !== "none" ? base + 3 : base;
}

export default function InteractiveMap({
  map,
  path,
  start,
  goal,
  selectedId,
  tool,
  pickTarget,
  onMapChange,
  onSelectNode,
  onSetStart,
  onSetGoal,
  onClearPath,
}: InteractiveMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(
    null
  );
  const [hoverId, setHoverId] = useState<string | null>(null);

  const nodeMap = Object.fromEntries(map.nodes.map((n) => [n.id, n]));
  const pathSet = new Set(path);

  const clientToSvg = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(24, Math.min(WIDTH - 24, p.x)),
      y: Math.max(24, Math.min(HEIGHT - 24, p.y)),
    };
  }, []);

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (pickTarget === "start") {
      onSetStart(id);
      return;
    }
    if (pickTarget === "goal") {
      onSetGoal(id);
      return;
    }

    if (tool === "link") {
      if (!linkFrom) {
        setLinkFrom(id);
        onSelectNode(id);
      } else if (linkFrom !== id) {
        onMapChange(toggleEdge(map, linkFrom, id));
        setLinkFrom(null);
        onClearPath();
      }
      return;
    }

    onSelectNode(id);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== "add") {
      onSelectNode(null);
      setLinkFrom(null);
      return;
    }
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const next = addNode(map, x, y);
    onMapChange(next);
    onClearPath();
    const added = next.nodes[next.nodes.length - 1];
    onSelectNode(added.id);
  };

  const onPointerDownNode = (id: string, e: React.PointerEvent) => {
    if (tool !== "select" || pickTarget) return;
    e.stopPropagation();
    const n = nodeMap[id];
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    setDragging({ id, ox: x - n.x, oy: y - n.y });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    onMapChange({
      ...map,
      nodes: map.nodes.map((n) =>
        n.id === dragging.id
          ? { ...n, x: x - dragging.ox, y: y - dragging.oy }
          : n
      ),
    });
    onClearPath();
  };

  const onPointerUp = () => setDragging(null);

  const cursor =
    tool === "add"
      ? "crosshair"
      : tool === "link"
        ? "pointer"
        : dragging
          ? "grabbing"
          : "default";

  return (
    <div className="relative panel overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full block select-none touch-none"
        style={{ cursor, minHeight: 360 }}
        onClick={handleCanvasClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#1a2433" strokeWidth="0.6" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5ee4a8" />
          </marker>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#grid)" />

        {map.edges.map((e, i) => {
          const a = nodeMap[e.source];
          const b = nodeMap[e.target];
          if (!a || !b) return null;
          const highlighted =
            selectedId === e.source ||
            selectedId === e.target ||
            linkFrom === e.source ||
            linkFrom === e.target;
          return (
            <line
              key={`${e.source}-${e.target}-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={highlighted ? "#4a6a8a" : "#2a3a50"}
              strokeWidth={highlighted ? 3 : 2}
              pointerEvents="none"
            />
          );
        })}

        {path.length > 1 && (
          <path
            d={path
              .map((id, i) => {
                const n = nodeMap[id];
                return `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`;
              })
              .join(" ")}
            fill="none"
            stroke="#5ee4a8"
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd="url(#arrow)"
            opacity={0.9}
            pointerEvents="none"
          />
        )}

        {map.nodes.map((n) => {
          const role =
            n.id === start ? "start" : n.id === goal ? "goal" : "none";
          const r = nodeRadius(n, role);
          const isSelected = selectedId === n.id;
          const onPath = pathSet.has(n.id);
          const isHover = hoverId === n.id;

          return (
            <g
              key={n.id}
              style={{ cursor: tool === "select" && !pickTarget ? "grab" : "pointer" }}
              onPointerDown={(e) => onPointerDownNode(n.id, e)}
              onClick={(e) => handleNodeClick(n.id, e)}
              onMouseEnter={() => setHoverId(n.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {onPath && (
                <circle cx={n.x} cy={n.y} r={r + 8} fill="#5ee4a8" opacity={0.15} />
              )}
              {isSelected && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r + 6}
                  fill="none"
                  stroke="#6eb5ff"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={r}
                fill={threatColor(n.threat)}
                fillOpacity={0.3 + n.civilian_risk * 0.2}
                stroke={
                  role === "start"
                    ? "#5ee4a8"
                    : role === "goal"
                      ? "#f0a86e"
                      : threatColor(n.threat)
                }
                strokeWidth={role !== "none" || isSelected ? 3 : 2}
              />
              {n.civilian_risk > 0.45 && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={r - 3}
                  fill="none"
                  stroke="#9b7ed8"
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )}
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                fill="#e8edf4"
                fontSize={role !== "none" ? 10 : 9}
                fontWeight={600}
                pointerEvents="none"
              >
                {n.id}
              </text>
              {role === "start" && (
                <text x={n.x} y={n.y - r - 8} textAnchor="middle" fill="#5ee4a8" fontSize={9} fontWeight={700} pointerEvents="none">
                  START
                </text>
              )}
              {role === "goal" && (
                <text x={n.x} y={n.y - r - 8} textAnchor="middle" fill="#f0a86e" fontSize={9} fontWeight={700} pointerEvents="none">
                  GOAL
                </text>
              )}
              {isHover && tool === "link" && linkFrom && linkFrom !== n.id && (
                <text x={n.x} y={n.y + r + 16} textAnchor="middle" fill="#8b9cb3" fontSize={8} pointerEvents="none">
                  click to connect
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {tool === "link" && linkFrom && (
        <p className="absolute bottom-2 left-2 text-xs text-battlefield-muted bg-battlefield-bg/90 px-2 py-1 rounded m-0">
          Link from <strong>{linkFrom}</strong> — click another node
        </p>
      )}
      {pickTarget && (
        <p className="absolute bottom-2 left-2 text-xs text-battlefield-accent bg-battlefield-bg/90 px-2 py-1 rounded m-0">
          Click a node to set {pickTarget === "start" ? "START" : "GOAL"}
        </p>
      )}
    </div>
  );
}

