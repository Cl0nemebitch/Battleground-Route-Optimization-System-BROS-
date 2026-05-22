import { useCallback, useEffect, useState } from "react";
import { fetchPreset, runAstar } from "./api";
import InteractiveMap, { type MapTool } from "./components/InteractiveMap";
import type { BattlefieldMap, CostWeights, Node, RouteResponse, TerrainType } from "./types";
import { removeNode, updateNode } from "./utils/mapEdit";

const DEFAULT_WEIGHTS: CostWeights = { alpha: 1, beta: 2.5, gamma: 1.2, delta: 5 };
const TERRAINS: TerrainType[] = ["open", "rough", "urban", "water"];

// ── Material icon helper ──────────────────────────────
function Icon({ name, size = 18, fill = true }: { name: string; size?: number; fill?: boolean }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        fontSize: size,
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' 400`,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {name}
    </span>
  );
}

// ── Mission clock (live) ──────────────────────────────
function MissionClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const hh = String(time.getUTCHours()).padStart(2, "0");
  const mm = String(time.getUTCMinutes()).padStart(2, "0");
  const ss = String(time.getUTCSeconds()).padStart(2, "0");
  return (
    <div className="flex items-center gap-2 font-mono text-[#f59e0b] text-xs">
      <Icon name="schedule" size={14} />
      <span>{hh}:{mm}:{ss} ZULU</span>
    </div>
  );
}

// ── Nav item ──────────────────────────────────────────
function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className={`flex items-center gap-3 px-4 py-2 text-xs uppercase tracking-widest font-mono transition-all ${
        active
          ? "bg-[#f59e0b]/10 text-[#f59e0b] border-l-2 border-[#f59e0b] animate-[pulse_4s_ease-in-out_infinite]"
          : "text-[#a08e7a] hover:bg-[#1a1f2e] hover:text-[#fbbf24]"
      }`}
    >
      <Icon name={icon} size={16} fill={active} />
      {label}
    </a>
  );
}

export default function App() {
  const [map, setMap]               = useState<BattlefieldMap | null>(null);
  const [preset, setPreset]         = useState<BattlefieldMap | null>(null);
  const [weights, setWeights]       = useState<CostWeights>(DEFAULT_WEIGHTS);
  const [start, setStart]           = useState("HQ");
  const [goal, setGoal]             = useState("OBJ");
  const [path, setPath]             = useState<string[]>([]);
  const [result, setResult]         = useState<RouteResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool]             = useState<MapTool>("select");
  const [pickTarget, setPickTarget] = useState<"start" | "goal" | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const missionActive               = path.length > 1;

  useEffect(() => {
    fetchPreset()
      .then((m) => { setMap(m); setPreset(m); })
      .catch((e) => setError(e.message));
  }, []);

  const selectedNode: Node | null =
    map && selectedId ? (map.nodes.find((n) => n.id === selectedId) ?? null) : null;

  const handleMapChange = useCallback((next: BattlefieldMap) => {
    setMap(next); setPath([]); setResult(null);
  }, []);

  const handleRun = useCallback(async () => {
    if (!map || !start || !goal) return;
    if (start === goal) { setError("Start and goal must differ."); return; }
    setLoading(true); setError(null);
    try {
      const res = await runAstar(map, start, goal, weights);
      setPath(res.path); setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Routing failed");
      setPath([]); setResult(null);
    } finally { setLoading(false); }
  }, [map, start, goal, weights]);

  const handleResetMap = () => {
    if (!preset) return;
    setMap(JSON.parse(JSON.stringify(preset)) as BattlefieldMap);
    setStart("HQ"); setGoal("OBJ");
    setPath([]); setResult(null); setSelectedId(null); setError(null);
  };

  const patchSelected = (patch: Partial<Node>) => {
    if (!map || !selectedId) return;
    handleMapChange(updateNode(map, selectedId, patch));
  };

  const handleDeleteSelected = () => {
    if (!map || !selectedId) return;
    if (selectedId === start || selectedId === goal) {
      setError("Cannot delete start or goal node."); return;
    }
    setMap(removeNode(map, selectedId)); setSelectedId(null);
    setPath([]); setResult(null);
  };

  // Cost breakdown percentages
  const bd = result?.breakdown;
  const bdTotal = bd ? (bd.distance ?? 0) + (bd.threat ?? 0) + (bd.terrain ?? 0) + (bd.civilian ?? 0) : 0;
  const pct = (v?: number) => bdTotal > 0 ? Math.round(((v ?? 0) / bdTotal) * 100) : 25;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0c10] text-[#f0e0d1] font-mono select-none">

      {/* CRT scanline overlay */}
      <div className="crt-overlay" />

      {/* ════════════════════════════════
          LEFT NAV — Aegis sidebar
      ════════════════════════════════ */}
      <nav className="w-[260px] shrink-0 bg-[#111520] border-r border-[#252d3d] flex flex-col z-40 shadow-[6px_0_30px_rgba(0,0,0,0.7)]">
        {/* Logo */}
        <div className="p-6 border-b border-[#252d3d] flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-[#0a0c10] border border-[#252d3d] mb-3 flex items-center justify-center">
            <span
              className="material-symbols-outlined text-4xl text-[#f59e0b]"
              style={{ fontVariationSettings: "'FILL' 1", filter: "drop-shadow(0 0 8px rgba(245,158,11,0.5))" }}
            >
              public
            </span>
          </div>
          <h1
            className="font-display text-xl font-bold text-[#f59e0b] tracking-[0.2em] uppercase m-0"
            style={{ filter: "drop-shadow(0 0 10px rgba(245,158,11,0.5))" }}
          >
            BROS
          </h1>
          <p className="text-[#e11d48] text-[9px] uppercase tracking-[0.2em] m-0 mt-1">
            Battlefield Route Ops
          </p>
        </div>

        {/* Nav */}
        <div className="flex-1 py-2 flex flex-col gap-0.5">
          <NavItem icon="grid_view"       label="Sectors"      active />
          <NavItem icon="psychology"      label="Intelligence" />
          <NavItem icon="local_shipping"  label="Logistics"    />
          <NavItem icon="warning"         label="Threat Zones" />
          <NavItem icon="terrain"         label="Terrain Map"  />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#252d3d] flex flex-col gap-3 bg-[#0d1018]">
          <MissionClock />

          {/* Threat level bar */}
          <div className="flex items-center gap-2 text-[#e11d48] text-[10px] animate-pulse">
            <Icon name="emergency_home" size={14} />
            <span className="uppercase tracking-widest">
              THREAT: {missionActive ? "HIGH" : "MODERATE"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[#252d3d] rounded-sm overflow-hidden">
            <div
              className={`h-full transition-all duration-700 ${missionActive ? "bg-[#e11d48]" : "bg-[#f59e0b]"}`}
              style={{ width: missionActive ? "80%" : "45%", animation: "pulseAmberBox 2s infinite" }}
            />
          </div>

          {error && (
            <div className="text-[9px] font-mono text-[#e11d48] bg-[#e11d48]/10 border border-[#e11d48]/40 px-2 py-1">
              ⚠ {error}
            </div>
          )}
        </div>
      </nav>

      {/* ════════════════════════════════
          CONTROL PANEL (right drawer)
      ════════════════════════════════ */}
      <aside className="w-[300px] shrink-0 bg-[#111520]/95 backdrop-blur border-r border-[#252d3d] flex flex-col z-30 overflow-y-auto shadow-[4px_0_20px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#252d3d] bg-[#0d1018]">
          <h2 className="font-display text-sm font-bold text-[#f59e0b] tracking-widest uppercase m-0">
            Route Parameters
          </h2>
          <p className="text-[#a08e7a] text-[9px] mt-0.5 m-0">Configure vector generation</p>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4">

          {/* Origin / Target vectors */}
          <div className="flex flex-col gap-3">
            {/* Start */}
            <button
              onClick={() => { setPickTarget(pickTarget === "start" ? null : "start"); setTool("select"); }}
              className={`flex items-center gap-3 p-2 border text-left transition-all ${
                pickTarget === "start"
                  ? "border-[#f59e0b] bg-[#f59e0b]/10"
                  : "border-[#252d3d] bg-[#0a0c10] hover:border-[#f59e0b]/50"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pickTarget === "start" ? "bg-[#f59e0b]" : "bg-[#f59e0b]/60"}`}
                style={{ boxShadow: "0 0 8px rgba(245,158,11,0.6)" }} />
              <div className="flex flex-col">
                <span className="text-[9px] text-[#a08e7a] uppercase tracking-widest">Origin Vector</span>
                <span className="text-[#f59e0b] text-xs">{start}</span>
              </div>
            </button>

            <div className="w-px h-3 bg-[#252d3d] mx-auto" />

            {/* Goal */}
            <button
              onClick={() => { setPickTarget(pickTarget === "goal" ? null : "goal"); setTool("select"); }}
              className={`flex items-center gap-3 p-2 border text-left transition-all ${
                pickTarget === "goal"
                  ? "border-[#e11d48] bg-[#e11d48]/10"
                  : "border-[#252d3d] bg-[#0a0c10] hover:border-[#e11d48]/50"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pickTarget === "goal" ? "bg-[#e11d48]" : "bg-[#e11d48]/60"}`}
                style={{ boxShadow: "0 0 8px rgba(225,29,72,0.6)" }} />
              <div className="flex flex-col">
                <span className="text-[9px] text-[#a08e7a] uppercase tracking-widest">Target Vector</span>
                <span className="text-[#e11d48] text-xs">{goal}</span>
              </div>
            </button>
          </div>

          {/* CTA button */}
          <button className="btn-primary" onClick={handleRun} disabled={loading || !map}>
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                fontVariationSettings: "'FILL' 1",
                animation: loading ? "radarSpin 2.5s linear infinite" : "none",
              }}
            >
              radar
            </span>
            {loading ? "Computing…" : "Compute Route"}
          </button>

          {/* Heuristic weights */}
          <div className="border-t border-[#252d3d] pt-3 flex flex-col gap-3">
            <h3 className="text-[9px] text-[#a08e7a] uppercase tracking-widest m-0">
              Heuristic Weights
            </h3>
            {(
              [
                ["alpha", "α Distance",  5],
                ["beta",  "β Threat",   10],
                ["gamma", "γ Terrain",   5],
                ["delta", "δ Civilian", 10],
              ] as [keyof CostWeights, string, number][]
            ).map(([key, label, max]) => (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#a08e7a] uppercase tracking-wider">{label}</span>
                  <span className="text-[#f59e0b]">{weights[key].toFixed(1)}x</span>
                </div>
                {/* Custom progress bar + hidden range */}
                <div className="relative h-3">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-[3px] bg-[#252d3d]">
                      <div
                        className="h-full bg-[#f59e0b]"
                        style={{ width: `${(weights[key] / max) * 100}%`, transition: "width 80ms" }}
                      />
                    </div>
                  </div>
                  <input
                    type="range" min={0} max={max} step={0.1}
                    value={weights[key]}
                    onChange={(e) => {
                      setWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }));
                      setPath([]); setResult(null);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                  />
                  {/* thumb indicator */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-[11px] h-[11px] bg-[#f59e0b] pointer-events-none"
                    style={{
                      left: `calc(${(weights[key] / max) * 100}% - 5.5px)`,
                      boxShadow: "0 0 7px rgba(245,158,11,0.8)",
                      transition: "left 80ms",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Cost Breakdown */}
          {result && (
            <div className="bg-[#0a0c10] border border-[#252d3d] p-3 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-mono text-[#a08e7a] uppercase tracking-widest border border-[#252d3d] px-2 py-0.5">
                  A* Algorithm
                </span>
                <span className="text-[#f59e0b] text-[10px]">Nodes: {result.expanded_nodes}</span>
              </div>
              <div
                className="font-display text-2xl font-bold text-[#f59e0b]"
                style={{ filter: "drop-shadow(0 0 6px rgba(245,158,11,0.5))" }}
              >
                {result.cost.toFixed(1)}
                <span className="text-[10px] text-[#a08e7a] font-normal ml-1">OPC</span>
              </div>
              {/* Breakdown bars */}
              <div className="flex h-1.5 gap-px overflow-hidden">
                <div className="bg-[#64748b]" style={{ width: `${pct(bd?.distance)}%` }} />
                <div className="bg-[#e11d48]" style={{ width: `${pct(bd?.threat)}%`   }} />
                <div className="bg-[#92400e]" style={{ width: `${pct(bd?.terrain)}%`  }} />
                <div className="bg-[#7c3aed]" style={{ width: `${pct(bd?.civilian)}%` }} />
              </div>
              <div className="flex justify-between text-[8px] text-[#a08e7a] uppercase">
                <span>Dist</span><span>Thr</span><span>Ter</span><span>Civ</span>
              </div>
              <div className="text-[9px] text-[#a08e7a] border-t border-[#252d3d] pt-2">
                Route:{" "}
                <span className="text-[#f59e0b]">{path.join(" → ")}</span>
              </div>
            </div>
          )}

          {/* Node inspector */}
          {selectedNode && (
            <div className="bg-[#0a0c10] border border-[#252d3d] p-3 flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[#252d3d] pb-2">
                <span className="text-[#f59e0b] text-[10px] uppercase tracking-widest">
                  Node · {selectedNode.id}
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="text-[9px] text-[#e11d48] hover:text-red-300 uppercase tracking-wider"
                >
                  Delete
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-[#a08e7a] uppercase tracking-widest">Terrain</span>
                <select
                  value={selectedNode.terrain}
                  onChange={(e) => patchSelected({ terrain: e.target.value as TerrainType })}
                  className="bg-[#111520] border border-[#252d3d] text-[#f0e0d1] text-xs px-2 py-1.5 cursor-pointer font-mono hover:border-[#f59e0b]/50 transition-colors"
                >
                  {TERRAINS.map((t) => (
                    <option key={t} value={t}>
                      {t === "water" ? "🌊 " : t === "rough" ? "⛰️ " : t === "urban" ? "🏙️ " : "🌿 "}{t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Threat */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#a08e7a] uppercase tracking-wider">Threat Level</span>
                  <span className="text-[#e11d48]">{selectedNode.threat.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={selectedNode.threat}
                  onChange={(e) => patchSelected({ threat: parseFloat(e.target.value) })}
                  style={{ accentColor: "#e11d48" }}
                />
                <div className="h-1 bg-[#252d3d] overflow-hidden">
                  <div className="h-full bg-[#e11d48] transition-all" style={{ width: `${selectedNode.threat * 100}%` }} />
                </div>
              </div>

              {/* Civilian */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#a08e7a] uppercase tracking-wider">Civilian Risk δ</span>
                  <span className="text-[#7c3aed]">{selectedNode.civilian_risk.toFixed(2)}</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={selectedNode.civilian_risk}
                  onChange={(e) => patchSelected({ civilian_risk: parseFloat(e.target.value) })}
                  style={{ accentColor: "#7c3aed" }}
                />
              </div>
            </div>
          )}

          {/* Tool row */}
          <div className="border-t border-[#252d3d] pt-3">
            <div className="text-[9px] text-[#a08e7a] uppercase tracking-widest mb-2">Map Tools</div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [["select","pan_tool","Move"], ["add","add_location","Add"], ["link","timeline","Link"]] as
                [MapTool, string, string][]
              ).map(([t, icon, label]) => (
                <button
                  key={t}
                  onClick={() => { setTool(t); setPickTarget(null); }}
                  className={`btn-tool ${tool === t ? "active" : ""}`}
                >
                  <Icon name={icon} size={13} fill={tool === t} />
                  {label}
                </button>
              ))}
              <button onClick={handleResetMap} className="btn-tool hover:!border-[#e11d48] hover:!text-[#e11d48]">
                <Icon name="restart_alt" size={13} />
                Reset
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════
          MAIN MAP
      ════════════════════════════════ */}
      <main className="flex-1 relative map-bg map-vignette crt-scan overflow-hidden">

        {/* MISSION ACTIVE badge */}
        {missionActive && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-1.5 border border-[#e11d48] bg-[#e11d48]/15 backdrop-blur-sm mission-ping">
            <div className="w-2 h-2 rounded-full bg-[#e11d48] animate-ping" />
            <span className="text-[#e11d48] text-[10px] tracking-[0.3em] uppercase font-mono">
              Mission Active
            </span>
          </div>
        )}

        {/* Pick target hint */}
        {pickTarget && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-1.5 border border-[#f59e0b] bg-[#f59e0b]/10 backdrop-blur-sm">
            <Icon name="ads_click" size={14} />
            <span className="text-[#f59e0b] text-[10px] tracking-[0.2em] uppercase">
              Click a node to set {pickTarget === "start" ? "ORIGIN" : "TARGET"}
            </span>
          </div>
        )}

        {/* Compass (top-right) */}
        <div className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#111520] border border-[#252d3d] flex items-center justify-center">
          <Icon name="explore" size={18} fill={false} />
          <span
            className="material-symbols-outlined text-[#f59e0b] absolute -top-0.5"
            style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}
          >north</span>
        </div>

        {/* Coordinate readout (bottom-right) */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 bg-[#111520]/90 border border-[#252d3d] px-3 py-1.5">
          <Icon name="my_location" size={12} />
          <span className="text-[#f59e0b] text-[9px] tracking-widest">
            34.0522° N · 118.2437° W
          </span>
        </div>

        {/* Loading state */}
        {!map && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3 text-[#f59e0b]/70">
              <span
                className="material-symbols-outlined text-4xl"
                style={{ fontVariationSettings: "'FILL' 1", animation: "radarSpin 2.5s linear infinite" }}
              >
                radar
              </span>
              <span className="text-[10px] tracking-[0.2em] uppercase">Acquiring terrain data…</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {!map && error && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-[#111520] border border-[#e11d48]/50 p-6 max-w-sm text-center flex flex-col gap-2">
              <p className="text-[#e11d48] text-sm m-0">⚠ API Connection Failure</p>
              <p className="text-[#a08e7a] text-[10px] m-0">{error}</p>
            </div>
          </div>
        )}

        {/* THE MAP */}
        {map && (
          <InteractiveMap
            map={map}
            path={path}
            start={start}
            goal={goal}
            selectedId={selectedId}
            tool={tool}
            pickTarget={pickTarget}
            onMapChange={handleMapChange}
            onSelectNode={setSelectedId}
            onSetStart={(id) => { setStart(id); setPickTarget(null); }}
            onSetGoal={(id)  => { setGoal(id);  setPickTarget(null); }}
            onClearPath={() => { setPath([]); setResult(null); }}
          />
        )}
      </main>
    </div>
  );
}
