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

function nodeRadius(n: Node, role: "start" | "goal" | "none"): number {
  const base = 22 + n.threat * 8 + n.civilian_risk * 4;
  return role !== "none" ? base + 5 : base;
}

function threatTint(threat: number): string | null {
  if (threat < 0.3) return null;
  if (threat < 0.6) return `rgba(251,146,60,${((threat - 0.3) / 0.3) * 0.38})`;
  return `rgba(220,38,38,${((threat - 0.6) / 0.4) * 0.48 + 0.14})`;
}

const TERRAIN_GRAD: Record<string, string> = {
  water: "grad-water",
  rough: "grad-rough",
  urban: "grad-urban",
  open:  "grad-open",
};

const TERRAIN_AURA: Record<string, string> = {
  water: "rgba(59,130,246,0.16)",
  rough: "rgba(161,110,70,0.15)",
  urban: "rgba(100,116,139,0.15)",
  open:  "rgba(34,197,94,0.13)",
};

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
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
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
    if (pickTarget === "start") { onSetStart(id); return; }
    if (pickTarget === "goal")  { onSetGoal(id);  return; }
    if (tool === "link") {
      if (!linkFrom) { setLinkFrom(id); onSelectNode(id); }
      else if (linkFrom !== id) { onMapChange(toggleEdge(map, linkFrom, id)); setLinkFrom(null); onClearPath(); }
      return;
    }
    onSelectNode(id);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (tool !== "add") { onSelectNode(null); setLinkFrom(null); return; }
    const { x, y } = clientToSvg(e.clientX, e.clientY);
    const next = addNode(map, x, y);
    onMapChange(next);
    onClearPath();
    onSelectNode(next.nodes[next.nodes.length - 1].id);
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
        n.id === dragging.id ? { ...n, x: x - dragging.ox, y: y - dragging.oy } : n
      ),
    });
    onClearPath();
  };

  const onPointerUp = () => setDragging(null);

  const cursor =
    tool === "add"    ? "crosshair"
    : tool === "link" ? "pointer"
    : dragging        ? "grabbing"
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
        {/* ═══════════════════════════════════════════════════════════
            DEFS — gradients, filters, patterns
        ═══════════════════════════════════════════════════════════ */}
        <defs>
          {/* ── Filters ── */}
          <filter id="shadow-blur" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
          </filter>
          <filter id="shadow-blur-sm" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          <filter id="glow-path" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-soft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* ── Terrain gradients — top-left lighting → 3D sphere look ── */}
          {/* WATER: dark deep-blue centre (depth), light sky-blue at top */}
          <radialGradient id="grad-water" cx="32%" cy="24%" r="72%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#bae6fd" />
            <stop offset="22%"  stopColor="#38bdf8" />
            <stop offset="55%"  stopColor="#1d4ed8" />
            <stop offset="85%"  stopColor="#0c2a6e" />
            <stop offset="100%" stopColor="#030e2a" />
          </radialGradient>

          {/* ROUGH/MOUNTAIN: warm sand highlight → deep brown rock base */}
          <radialGradient id="grad-rough" cx="32%" cy="24%" r="72%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#fde68a" />
            <stop offset="22%"  stopColor="#b47d3a" />
            <stop offset="55%"  stopColor="#78481e" />
            <stop offset="85%"  stopColor="#3d2208" />
            <stop offset="100%" stopColor="#160c02" />
          </radialGradient>

          {/* URBAN: bright concrete top → deep shadow base */}
          <radialGradient id="grad-urban" cx="32%" cy="24%" r="72%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#f1f5f9" />
            <stop offset="22%"  stopColor="#94a3b8" />
            <stop offset="55%"  stopColor="#3f5068" />
            <stop offset="85%"  stopColor="#1a2535" />
            <stop offset="100%" stopColor="#06101e" />
          </radialGradient>

          {/* OPEN: bright lime highlight → deep forest green */}
          <radialGradient id="grad-open" cx="32%" cy="24%" r="72%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="#d9f99d" />
            <stop offset="22%"  stopColor="#4ade80" />
            <stop offset="55%"  stopColor="#16a34a" />
            <stop offset="85%"  stopColor="#064e1e" />
            <stop offset="100%" stopColor="#011a09" />
          </radialGradient>

          {/* Specular highlight — white sheen at top-left for all terrains */}
          <radialGradient id="specular" cx="30%" cy="20%" r="52%" gradientUnits="objectBoundingBox">
            <stop offset="0%"   stopColor="white" stopOpacity="0.52" />
            <stop offset="50%"  stopColor="white" stopOpacity="0.10" />
            <stop offset="100%" stopColor="white" stopOpacity="0"    />
          </radialGradient>

          {/* ── Patterns ── */}
          {/* Urban rooftop grid */}
          <pattern id="urban-grid-pat" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
          </pattern>

          {/* Topographic background grid */}
          <pattern id="topo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#14213a" strokeWidth="0.55" />
            <path d="M 20 0 L 20 3 M 0 20 L 3 20" fill="none" stroke="#14213a" strokeWidth="0.3" />
          </pattern>

          {/* ── Path arrow marker ── */}
          <marker id="arrow-vol" viewBox="0 0 12 12" refX="10" refY="6"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 12 6 L 0 12 z" fill="#5ee4a8" />
          </marker>

          {/* Background vignette */}
          <radialGradient id="bg-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.6)" />
          </radialGradient>
        </defs>

        {/* ═══════════════════════════════════════════════════════════
            BACKGROUND
        ═══════════════════════════════════════════════════════════ */}
        <rect width={WIDTH} height={HEIGHT} fill="#060d1c" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#topo-grid)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#bg-vignette)" pointerEvents="none" />

        {/* ═══════════════════════════════════════════════════════════
            TERRAIN AURAS — atmospheric glow behind each node
        ═══════════════════════════════════════════════════════════ */}
        {map.nodes.map((n) => {
          const role = n.id === start ? "start" : n.id === goal ? "goal" : "none";
          const r = nodeRadius(n, role);
          return (
            <circle key={`aura-${n.id}`}
              cx={n.x} cy={n.y} r={r * 3.2}
              fill={TERRAIN_AURA[n.terrain] ?? TERRAIN_AURA.open}
              style={{ filter: "blur(22px)" }}
              pointerEvents="none"
            />
          );
        })}

        {/* ═══════════════════════════════════════════════════════════
            CAST SHADOWS — elevation-based offset per terrain
        ═══════════════════════════════════════════════════════════ */}
        {map.nodes.map((n) => {
          const role = n.id === start ? "start" : n.id === goal ? "goal" : "none";
          const r = nodeRadius(n, role);
          // [cx-offset, cy-offset, rx-scale, ry-scale] — rough = tallest = biggest offset
          const cfg: Record<string, [number, number, number, number]> = {
            water: [2,  5,  0.86, 0.35],
            rough: [10, 16, 0.80, 0.33],
            urban: [8,  12, 0.84, 0.36],
            open:  [2,  6,  0.88, 0.37],
          };
          const [dx, dy, rx, ry] = cfg[n.terrain] ?? cfg.open;
          return (
            <ellipse key={`shadow-${n.id}`}
              cx={n.x + dx} cy={n.y + dy}
              rx={r * rx} ry={r * ry}
              fill="rgba(0,0,0,0.55)"
              filter="url(#shadow-blur)"
              pointerEvents="none"
            />
          );
        })}

        {/* ═══════════════════════════════════════════════════════════
            EDGES
        ═══════════════════════════════════════════════════════════ */}
        {map.edges.map((e, i) => {
          const a = nodeMap[e.source];
          const b = nodeMap[e.target];
          if (!a || !b) return null;
          const highlighted =
            selectedId === e.source || selectedId === e.target ||
            linkFrom   === e.source || linkFrom   === e.target;
          return (
            <line key={`${e.source}-${e.target}-${i}`}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={highlighted ? "#3d6a9a" : "#1a2e4a"}
              strokeWidth={highlighted ? 3 : 2}
              pointerEvents="none"
            />
          );
        })}

        {/* ═══════════════════════════════════════════════════════════
            ROUTE PATH — glowing with arrow
        ═══════════════════════════════════════════════════════════ */}
        {path.length > 1 && (() => {
          const d = path
            .map((id, i) => { const n = nodeMap[id]; return `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`; })
            .join(" ");
          return (
            <>
              {/* Wide outer glow */}
              <path d={d} fill="none" stroke="#5ee4a8" strokeWidth={12}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.12} pointerEvents="none" />
              {/* Mid glow */}
              <path d={d} fill="none" stroke="#5ee4a8" strokeWidth={6}
                strokeLinecap="round" strokeLinejoin="round"
                opacity={0.22} pointerEvents="none" />
              {/* Main line */}
              <path d={d} fill="none" stroke="#5ee4a8" strokeWidth={3.5}
                strokeLinecap="round" strokeLinejoin="round"
                markerEnd="url(#arrow-vol)" opacity={0.95}
                filter="url(#glow-path)" pointerEvents="none" />
            </>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════
            NODES — volumetric terrain rendering
        ═══════════════════════════════════════════════════════════ */}
        {map.nodes.map((n) => {
          const role     = n.id === start ? "start" : n.id === goal ? "goal" : "none";
          const r        = nodeRadius(n, role);
          const isSelected = selectedId === n.id;
          const onPath   = pathSet.has(n.id);
          const isHover  = hoverId === n.id;
          const gradId   = TERRAIN_GRAD[n.terrain] ?? "grad-open";
          const tint     = threatTint(n.threat);

          return (
            <g
              key={n.id}
              style={{ cursor: tool === "select" && !pickTarget ? "grab" : "pointer" }}
              onPointerDown={(e) => onPointerDownNode(n.id, e)}
              onClick={(e) => handleNodeClick(n.id, e)}
              onMouseEnter={() => setHoverId(n.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              {/* ── WATER: depth rings + animated ripples ── */}
              {n.terrain === "water" && (
                <>
                  {/* Concentric depth halos */}
                  {([1.9, 1.55, 1.22] as number[]).map((s, i) => (
                    <circle key={`wd${i}`} cx={n.x} cy={n.y} r={r * s}
                      fill="none"
                      stroke={`rgba(56,189,248,${0.06 + i * 0.05})`}
                      strokeWidth={1.5}
                      pointerEvents="none"
                    />
                  ))}
                  {/* Animated ripples — 3 staggered */}
                  {([0, 1, 2] as number[]).map((i) => (
                    <circle key={`rip${i}`} cx={n.x} cy={n.y} r={r * 0.7}
                      fill="none"
                      stroke={i === 0 ? "#93c5fd" : i === 1 ? "#60a5fa" : "#3b82f6"}
                      strokeWidth={1.8 - i * 0.5}
                      opacity={0}
                      pointerEvents="none"
                    >
                      <animate attributeName="r"
                        values={`${r * 0.7};${r * 2.9}`}
                        dur="3s" repeatCount="indefinite" begin={`${i}s`} />
                      <animate attributeName="opacity"
                        values={`${0.55 - i * 0.12};0`}
                        dur="3s" repeatCount="indefinite" begin={`${i}s`} />
                    </circle>
                  ))}
                </>
              )}

              {/* ── ROUGH/MOUNTAIN: topographic contour rings ── */}
              {n.terrain === "rough" && (
                <>
                  {([2.3, 1.78, 1.35] as number[]).map((s, i) => (
                    <ellipse key={`tc${i}`}
                      cx={n.x} cy={n.y + i * 3.5}
                      rx={r * s} ry={r * s * 0.60}
                      fill="none"
                      stroke={`rgba(160,120,60,${0.08 + i * 0.08})`}
                      strokeWidth={1.5}
                      strokeDasharray={i === 0 ? "5 4" : undefined}
                      pointerEvents="none"
                    />
                  ))}
                </>
              )}

              {/* ── URBAN: 3-D building wall illusion ── */}
              {n.terrain === "urban" && (
                <>
                  {/* Two offset dark circles = right+bottom walls */}
                  <circle cx={n.x + r * 0.33} cy={n.y + r * 0.33} r={r}
                    fill="#080f1c" pointerEvents="none" />
                  <circle cx={n.x + r * 0.18} cy={n.y + r * 0.18} r={r}
                    fill="#101d2e" pointerEvents="none" />
                </>
              )}

              {/* ── OPEN: soft ground glow ── */}
              {n.terrain === "open" && (
                <circle cx={n.x} cy={n.y} r={r * 1.55}
                  fill="rgba(34,197,94,0.07)" pointerEvents="none" />
              )}

              {/* ── Selection / path rings ── */}
              {onPath && (
                <circle cx={n.x} cy={n.y} r={r + 11}
                  fill="#5ee4a8" opacity={0.15} pointerEvents="none" />
              )}
              {isSelected && (
                <circle cx={n.x} cy={n.y} r={r + 8}
                  fill="none" stroke="#6eb5ff" strokeWidth={2} strokeDasharray="4 3"
                  pointerEvents="none" />
              )}
              {role !== "none" && (
                <circle cx={n.x} cy={n.y} r={r + 5}
                  fill="none"
                  stroke={role === "start" ? "#5ee4a8" : "#f0a86e"}
                  strokeWidth={2.5}
                  pointerEvents="none"
                />
              )}

              {/* ── MAIN SPHERE ── */}
              <circle cx={n.x} cy={n.y} r={r} fill={`url(#${gradId})`} />

              {/* Threat tint overlay */}
              {tint && (
                <circle cx={n.x} cy={n.y} r={r} fill={tint} pointerEvents="none" />
              )}

              {/* ── WATER surface overlays ── */}
              {n.terrain === "water" && (
                <>
                  {/* Caustic light reflections */}
                  <ellipse
                    cx={n.x - r * 0.22} cy={n.y - r * 0.34}
                    rx={r * 0.38} ry={r * 0.18}
                    fill="rgba(255,255,255,0.30)"
                    style={{ filter: "blur(3px)" }}
                    pointerEvents="none"
                  />
                  <ellipse
                    cx={n.x + r * 0.10} cy={n.y - r * 0.11}
                    rx={r * 0.15} ry={r * 0.07}
                    fill="rgba(255,255,255,0.18)"
                    style={{ filter: "blur(2px)" }}
                    pointerEvents="none"
                  />
                </>
              )}

              {/* ── MOUNTAIN overlays: snow cap + rock cracks ── */}
              {n.terrain === "rough" && (
                <>
                  <ellipse
                    cx={n.x} cy={n.y - r * 0.53}
                    rx={r * 0.37} ry={r * 0.21}
                    fill="rgba(255,255,255,0.88)"
                    style={{ filter: "blur(1.5px)" }}
                    pointerEvents="none"
                  />
                  {/* Rock crack lines */}
                  <path
                    d={`M ${n.x - r * 0.06} ${n.y - r * 0.27} L ${n.x + r * 0.20} ${n.y + r * 0.16}`}
                    stroke="rgba(30,15,5,0.28)" strokeWidth={0.9} fill="none" pointerEvents="none"
                  />
                  <path
                    d={`M ${n.x + r * 0.08} ${n.y - r * 0.15} L ${n.x - r * 0.16} ${n.y + r * 0.28}`}
                    stroke="rgba(30,15,5,0.20)" strokeWidth={0.7} fill="none" pointerEvents="none"
                  />
                </>
              )}

              {/* ── URBAN overlays: grid texture + window lights + rooftop edge ── */}
              {n.terrain === "urban" && (
                <>
                  <circle cx={n.x} cy={n.y} r={r}
                    fill="url(#urban-grid-pat)" opacity={0.32} pointerEvents="none" />
                  {/* Bright rooftop edge = top face of building */}
                  <circle cx={n.x} cy={n.y} r={r}
                    fill="none" stroke="rgba(203,213,225,0.55)" strokeWidth={1.5}
                    pointerEvents="none" />
                  {/* Window lights — fixed deterministic offsets */}
                  {([[-0.28, -0.24], [0.18, -0.28], [-0.10, 0.13], [0.24, 0.08]] as [number,number][]).map(([dx, dy], i) => (
                    <rect key={`win${i}`}
                      x={n.x + dx * r - 2.5} y={n.y + dy * r - 2}
                      width={5} height={3.5}
                      fill="rgba(253,224,71,0.58)"
                      rx={0.5}
                      pointerEvents="none"
                    />
                  ))}
                </>
              )}

              {/* ── SPECULAR HIGHLIGHT — white sheen → 3D sphere look for all terrains ── */}
              <circle cx={n.x} cy={n.y} r={r}
                fill="url(#specular)" pointerEvents="none" />

              {/* Civilian risk dashed ring */}
              {n.civilian_risk > 0.45 && (
                <circle cx={n.x} cy={n.y} r={r - 5}
                  fill="none" stroke="#9b7ed8" strokeWidth={1.5} strokeDasharray="3 2"
                  pointerEvents="none" />
              )}

              {/* ── LABEL ── */}
              <text
                x={n.x} y={n.y + 5}
                textAnchor="middle"
                fill="#e8edf4"
                fontSize={role !== "none" ? 11 : 10}
                fontWeight={700}
                pointerEvents="none"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.95))" }}
              >
                {n.id}
              </text>

              {role === "start" && (
                <text x={n.x} y={n.y - r - 10}
                  textAnchor="middle" fill="#5ee4a8"
                  fontSize={9} fontWeight={700} pointerEvents="none"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}>
                  START
                </text>
              )}
              {role === "goal" && (
                <text x={n.x} y={n.y - r - 10}
                  textAnchor="middle" fill="#f0a86e"
                  fontSize={9} fontWeight={700} pointerEvents="none"
                  style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.9))" }}>
                  GOAL
                </text>
              )}
              {isHover && tool === "link" && linkFrom && linkFrom !== n.id && (
                <text x={n.x} y={n.y + r + 17}
                  textAnchor="middle" fill="#8b9cb3"
                  fontSize={8} pointerEvents="none">
                  click to connect
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tool hints */}
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
