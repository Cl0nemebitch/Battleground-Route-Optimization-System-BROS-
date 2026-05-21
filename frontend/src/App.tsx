import { useCallback, useEffect, useState } from "react";
import { fetchPreset, runAstar } from "./api";
import InteractiveMap, { type MapTool } from "./components/InteractiveMap";
import type { BattlefieldMap, CostWeights, Node, RouteResponse, TerrainType } from "./types";
import { removeNode, updateNode } from "./utils/mapEdit";

const DEFAULT_WEIGHTS: CostWeights = { alpha: 1, beta: 2.5, gamma: 1.2, delta: 5 };
const TERRAINS: TerrainType[] = ["open", "rough", "urban", "water"];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{ fontSize: size, fontVariationSettings: "'FILL' 1, 'wght' 400" }}
    >
      {name}
    </span>
  );
}

export default function App() {
  const [map, setMap]             = useState<BattlefieldMap | null>(null);
  const [preset, setPreset]       = useState<BattlefieldMap | null>(null);
  const [weights, setWeights]     = useState<CostWeights>(DEFAULT_WEIGHTS);
  const [start, setStart]         = useState("HQ");
  const [goal, setGoal]           = useState("OBJ");
  const [path, setPath]           = useState<string[]>([]);
  const [result, setResult]       = useState<RouteResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool]           = useState<MapTool>("select");
  const [pickTarget, setPickTarget] = useState<"start" | "goal" | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

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
    if (start === goal) { setError("Start and goal must be different."); return; }
    setLoading(true); setError(null);
    try {
      const res = await runAstar(map, start, goal, weights);
      setPath(res.path); setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Routing failed");
      setPath([]); setResult(null);
    } finally {
      setLoading(false);
    }
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
      setError("Cannot delete start or goal. Pick a new one first."); return;
    }
    setMap(removeNode(map, selectedId)); setSelectedId(null);
    setPath([]); setResult(null);
  };

  // ── Breakdown percentages ──
  const breakdown = result?.breakdown;
  const bTotal = breakdown
    ? (breakdown.distance ?? 0) + (breakdown.threat ?? 0) + (breakdown.terrain ?? 0) + (breakdown.civilian ?? 0)
    : 0;
  const pct = (v?: number) => bTotal > 0 ? Math.round(((v ?? 0) / bTotal) * 100) : 25;

  return (
    <div className="flex h-screen overflow-hidden bg-[#060d1c] text-slate-300 font-body select-none">

      {/* ═══════════════════════════════
          LEFT NAV (Stitch sidebar)
      ═══════════════════════════════ */}
      <nav className="w-64 shrink-0 bg-[#0c1726] border-r border-[#1e3050] flex flex-col py-5 px-3 gap-1 z-50 shadow-[6px_0_30px_rgba(0,0,0,0.6)]">
        {/* Logo */}
        <div className="px-2 mb-6">
          <h1 className="font-headline font-black text-2xl text-[#5ee4a8] tracking-tight drop-shadow-[0_0_10px_rgba(94,228,168,0.5)] m-0">
            BROS
          </h1>
          <p className="font-mono text-[9px] text-[#5ee4a8]/60 uppercase tracking-widest m-0 mt-1">
            Battlefield Route Optimization
          </p>
        </div>

        {/* Nav links */}
        <NavItem icon="route" label="Route Planner" active />
        <NavItem icon="map"    label="Map View" />
        <NavItem icon="warning" label="Threat Analysis" />
        <NavItem icon="terrain" label="Terrain Intel" />
        <NavItem icon="group"   label="Unit Tracking" />

        {/* Status block */}
        <div className="mt-auto pt-4 border-t border-[#1e3050] space-y-2 px-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5ee4a8] shadow-[0_0_6px_#5ee4a8]" />
            TERMINAL ALPHA-9
          </div>
          {error && (
            <div className="text-[9px] font-mono text-red-400 bg-red-900/20 border border-red-800/50 rounded px-2 py-1">
              ⚠ {error}
            </div>
          )}
        </div>
      </nav>

      {/* ═══════════════════════════════
          CONTROL PANEL (tool sidebar)
      ═══════════════════════════════ */}
      <aside className="w-72 shrink-0 bg-[#0c1726]/90 backdrop-blur-xl border-r border-[#1e3050] flex flex-col overflow-y-auto z-40 shadow-2xl">
        <div className="p-5 flex flex-col gap-5">

          {/* Route Setup */}
          <div className="bg-[#060d1c]/60 border border-[#1e3050] rounded-lg p-4 relative">
            {/* Connector line */}
            <div className="absolute left-8 top-10 bottom-10 w-px">
              <div className="h-full bg-gradient-to-b from-[#5ee4a8] to-[#f0a86e] opacity-40" />
            </div>

            {/* Start node */}
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="px-2 py-1 bg-[#5ee4a8]/15 border border-[#5ee4a8] rounded text-[#5ee4a8] font-mono text-[10px] font-bold shadow-[0_0_8px_rgba(94,228,168,0.3)] shrink-0">
                START
              </div>
              <button
                onClick={() => { setPickTarget(pickTarget === "start" ? null : "start"); setTool("select"); }}
                className={`flex-1 text-left bg-[#060d1c] border rounded px-3 py-1.5 font-mono text-sm transition-all ${pickTarget === "start" ? "border-[#5ee4a8] text-[#5ee4a8]" : "border-[#1e3050] text-slate-300 hover:border-[#5ee4a8]/50"}`}
              >
                {start}
              </button>
            </div>

            {/* Goal node */}
            <div className="flex items-center gap-3 relative z-10">
              <div className="px-2 py-1 bg-[#f0a86e]/15 border border-[#f0a86e] rounded text-[#f0a86e] font-mono text-[10px] font-bold shadow-[0_0_8px_rgba(240,168,110,0.3)] shrink-0">
                GOAL
              </div>
              <button
                onClick={() => { setPickTarget(pickTarget === "goal" ? null : "goal"); setTool("select"); }}
                className={`flex-1 text-left bg-[#060d1c] border rounded px-3 py-1.5 font-mono text-sm transition-all ${pickTarget === "goal" ? "border-[#f0a86e] text-[#f0a86e]" : "border-[#1e3050] text-slate-300 hover:border-[#f0a86e]/50"}`}
              >
                {goal}
              </button>
            </div>
          </div>

          {/* Run button */}
          <button className="btn-primary w-full" onClick={handleRun} disabled={loading || !map}>
            {loading ? (
              <>
                <Icon name="radar" size={16} /> Computing…
              </>
            ) : (
              <>
                <Icon name="route" size={16} /> Find Optimal Route
              </>
            )}
          </button>

          {/* Cost Weights */}
          <div className="border-t border-[#1e3050] pt-4 space-y-3">
            <h3 className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-slate-400 m-0">
              <Icon name="tune" size={14} /> Heuristic Weights
            </h3>
            {(
              [
                ["alpha", "α Distance", 5],
                ["beta",  "β Threat",   10],
                ["gamma", "γ Terrain",  5],
                ["delta", "δ Civilian", 10],
              ] as [keyof CostWeights, string, number][]
            ).map(([key, label, max]) => (
              <label key={key} className="block space-y-1">
                <div className="flex justify-between">
                  <span className="slider-label">{label}</span>
                  <span className="font-mono text-[10px] text-[#5ee4a8]">
                    {weights[key].toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range" min={0} max={max} step={0.1}
                  value={weights[key]}
                  onChange={(e) => {
                    setWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }));
                    setPath([]); setResult(null);
                  }}
                />
              </label>
            ))}
          </div>

          {/* Cost Breakdown */}
          {result && (
            <div className="bg-[#060d1c] border border-[#1e3050] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="bg-[#1e3050] text-slate-400 text-[9px] font-mono px-2 py-0.5 rounded border border-slate-600 uppercase">
                  A* Algorithm
                </span>
                <span className="text-[#5ee4a8] font-mono text-[10px]">
                  Nodes: {result.expanded_nodes}
                </span>
              </div>
              <div className="font-headline font-bold text-2xl text-white">
                {result.cost.toFixed(1)}{" "}
                <span className="text-xs font-mono text-slate-500 font-normal">OPC</span>
              </div>
              {/* Breakdown bar */}
              <div className="flex h-2 rounded overflow-hidden gap-px">
                <div className="h-full bg-slate-500"   style={{ width: `${pct(breakdown?.distance)}%` }} title="Distance" />
                <div className="h-full bg-red-600"     style={{ width: `${pct(breakdown?.threat)}%`   }} title="Threat"   />
                <div className="h-full bg-[#a07850]"   style={{ width: `${pct(breakdown?.terrain)}%`  }} title="Terrain"  />
                <div className="h-full bg-[#9b7ed8]"   style={{ width: `${pct(breakdown?.civilian)}%` }} title="Civilian" />
              </div>
              <div className="flex justify-between font-mono text-[8px] text-slate-500 uppercase">
                <span>Dist</span><span>Thr</span><span>Ter</span><span>Civ</span>
              </div>
              <div className="pt-1 border-t border-[#1e3050] font-mono text-[10px] text-slate-400">
                Route:{" "}
                <span className="text-[#5ee4a8]">{path.join(" → ")}</span>
              </div>
            </div>
          )}

          {/* Node Inspector */}
          {selectedNode && (
            <div className="bg-[#060d1c] border border-[#1e3050] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-xs text-[#5ee4a8] uppercase tracking-widest m-0">
                  Node · {selectedNode.id}
                </h3>
                <button
                  onClick={handleDeleteSelected}
                  className="text-[10px] text-red-400 hover:text-red-300 font-mono"
                >
                  DELETE
                </button>
              </div>

              {/* Terrain selector */}
              <label className="block text-[10px] text-slate-500 font-mono uppercase tracking-wider space-y-1">
                Terrain
                <select
                  value={selectedNode.terrain}
                  onChange={(e) => patchSelected({ terrain: e.target.value as TerrainType })}
                  className="w-full mt-1 bg-[#0c1726] border border-[#1e3050] rounded px-2 py-1.5 text-sm font-mono text-slate-300 cursor-pointer hover:border-[#5ee4a8]/50 transition-colors"
                >
                  {TERRAINS.map((t) => (
                    <option key={t} value={t}>
                      {t === "water" ? "🌊 " : t === "rough" ? "⛰️ " : t === "urban" ? "🏙️ " : "🌿 "}
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              {/* Threat slider */}
              <label className="block space-y-1">
                <div className="flex justify-between">
                  <span className="slider-label">Threat Level</span>
                  <span className="font-mono text-[10px] text-red-400">{selectedNode.threat.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05}
                  value={selectedNode.threat}
                  onChange={(e) => patchSelected({ threat: parseFloat(e.target.value) })}
                  style={{ accentColor: "#dc2626" }}
                />
                {/* Threat bar */}
                <div className="h-1 rounded bg-[#1e3050] overflow-hidden">
                  <div className="h-full bg-red-600 transition-all" style={{ width: `${selectedNode.threat * 100}%` }} />
                </div>
              </label>

              {/* Civilian risk slider */}
              <label className="block space-y-1">
                <div className="flex justify-between">
                  <span className="slider-label">Civilian Risk δ</span>
                  <span className="font-mono text-[10px] text-[#9b7ed8]">{selectedNode.civilian_risk.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05}
                  value={selectedNode.civilian_risk}
                  onChange={(e) => patchSelected({ civilian_risk: parseFloat(e.target.value) })}
                  style={{ accentColor: "#9b7ed8" }}
                />
              </label>
            </div>
          )}

          {/* Toolbar */}
          <div className="border-t border-[#1e3050] pt-4">
            <p className="slider-label mb-2 m-0">Map Tools</p>
            <div className="flex flex-wrap gap-2">
              {(
                [["select", "pan_tool", "Move"], ["add", "add_location", "Add"], ["link", "timeline", "Link"]] as
                  [MapTool, string, string][]
              ).map(([t, icon, label]) => (
                <button
                  key={t}
                  title={label}
                  onClick={() => { setTool(t); setPickTarget(null); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-mono border transition-all ${tool === t ? "border-[#5ee4a8] bg-[#5ee4a8]/10 text-[#5ee4a8]" : "border-[#1e3050] text-slate-500 hover:border-slate-400 hover:text-slate-300"}`}
                >
                  <Icon name={icon} size={14} />{label}
                </button>
              ))}
              <button
                onClick={handleResetMap}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-mono border border-[#1e3050] text-slate-500 hover:border-red-500 hover:text-red-400 transition-all"
              >
                <Icon name="restart_alt" size={14} />Reset
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════
          MAIN MAP AREA
      ═══════════════════════════════ */}
      <main className="flex-1 relative map-bg map-vignette scanline overflow-hidden">
        {/* Corner coordinates overlay */}
        <div className="absolute bottom-4 right-6 font-mono text-[9px] text-slate-600 text-right pointer-events-none z-20">
          <p className="m-0">LAT: 34.0522° N &nbsp; LON: 118.2437° W</p>
          <p className="m-0">ELEVATION: 84m MSL</p>
          <p className="m-0">
            THREAT:{" "}
            <span className={result ? "text-red-400" : "text-[#f97316]"}>
              {result ? "ACTIVE ROUTE" : "MODERATE"}
            </span>
          </p>
        </div>

        {/* Pick target banner */}
        {pickTarget && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 font-mono text-xs px-4 py-2 bg-[#0c1726]/95 border border-[#5ee4a8]/50 rounded-full text-[#5ee4a8] shadow-[0_0_20px_rgba(94,228,168,0.3)]">
            <Icon name="ads_click" size={14} />
            {" "}Click a node to set {pickTarget === "start" ? "START" : "GOAL"}
          </div>
        )}

        {/* Error / loading state */}
        {!map && !error && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-3 font-mono text-[#5ee4a8]/60">
              <span className="material-symbols-outlined text-4xl animate-spin" style={{ animationDuration: "2s" }}>radar</span>
              <span className="text-xs tracking-widest uppercase">Loading terrain…</span>
            </div>
          </div>
        )}
        {!map && error && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="panel p-6 max-w-sm text-center space-y-2">
              <p className="text-red-400 font-mono text-sm m-0">⚠ Failed to connect to API</p>
              <p className="text-slate-500 text-xs m-0">{error}</p>
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

function NavItem({ icon, label, active }: { icon: string; label: string; active?: boolean }) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-mono uppercase tracking-tight transition-all duration-200 ${
        active
          ? "bg-[#5ee4a8]/10 text-[#5ee4a8] border-r-2 border-[#5ee4a8] shadow-[inset_-8px_0_16px_rgba(94,228,168,0.08)]"
          : "text-slate-500 hover:bg-[#1e3050] hover:text-[#5ee4a8] hover:translate-x-1"
      }`}
    >
      <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
        {icon}
      </span>
      {label}
    </a>
  );
}
