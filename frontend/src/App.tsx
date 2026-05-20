import { useCallback, useEffect, useState } from "react";
import { fetchPreset, runAstar } from "./api";
import CostBreakdown from "./components/CostBreakdown";
import InteractiveMap, { type MapTool } from "./components/InteractiveMap";
import type { BattlefieldMap, CostWeights, Node, RouteResponse, TerrainType } from "./types";
import { removeNode, updateNode } from "./utils/mapEdit";

const DEFAULT_WEIGHTS: CostWeights = {
  alpha: 1,
  beta: 2,
  gamma: 1.5,
  delta: 3,
};

const TERRAINS: TerrainType[] = ["open", "rough", "urban", "water"];

export default function App() {
  const [map, setMap] = useState<BattlefieldMap | null>(null);
  const [preset, setPreset] = useState<BattlefieldMap | null>(null);
  const [weights, setWeights] = useState<CostWeights>(DEFAULT_WEIGHTS);
  const [start, setStart] = useState("HQ");
  const [goal, setGoal] = useState("OBJ");
  const [path, setPath] = useState<string[]>([]);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<MapTool>("select");
  const [pickTarget, setPickTarget] = useState<"start" | "goal" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPreset()
      .then((m) => {
        setMap(m);
        setPreset(m);
      })
      .catch((e) => setError(e.message));
  }, []);

  const selectedNode: Node | null =
    map && selectedId ? (map.nodes.find((n) => n.id === selectedId) ?? null) : null;

  const handleMapChange = useCallback((next: BattlefieldMap) => {
    setMap(next);
    setPath([]);
    setResult(null);
  }, []);

  const handleRun = useCallback(async () => {
    if (!map || !start || !goal) return;
    if (start === goal) {
      setError("Start and goal must be different nodes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await runAstar(map, start, goal, weights);
      setPath(res.path);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Routing failed");
      setPath([]);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [map, start, goal, weights]);

  const handleDeleteSelected = () => {
    if (!map || !selectedId) return;
    if (selectedId === start || selectedId === goal) {
      setError("Cannot delete start or goal node. Pick a new one first.");
      return;
    }
    const next = removeNode(map, selectedId);
    setMap(next);
    setSelectedId(null);
    setPath([]);
    setResult(null);
  };

  const handleResetMap = () => {
    if (!preset) return;
    setMap(JSON.parse(JSON.stringify(preset)) as BattlefieldMap);
    setStart("HQ");
    setGoal("OBJ");
    setPath([]);
    setResult(null);
    setSelectedId(null);
    setError(null);
  };

  const patchSelected = (patch: Partial<Node>) => {
    if (!map || !selectedId) return;
    handleMapChange(updateNode(map, selectedId, patch));
  };

  const weightSlider = (
    key: keyof CostWeights,
    label: string,
    max = 5
  ) => (
    <label className="block space-y-1">
      <div className="flex justify-between">
        <span className="slider-label">{label}</span>
        <span className="font-mono text-xs text-battlefield-accent">
          {weights[key].toFixed(1)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={weights[key]}
        onChange={(e) => {
          setWeights((w) => ({ ...w, [key]: parseFloat(e.target.value) }));
          setPath([]);
          setResult(null);
        }}
        className="w-full accent-battlefield-accent"
      />
    </label>
  );

  const toolBtn = (t: MapTool, label: string, hint: string) => (
    <button
      type="button"
      title={hint}
      onClick={() => {
        setTool(t);
        setPickTarget(null);
        if (t !== "link") setSelectedId(selectedId);
      }}
      className={`px-3 py-1.5 rounded-lg text-sm border transition ${
        tool === t
          ? "border-battlefield-accent bg-battlefield-accent/15 text-battlefield-accent"
          : "border-battlefield-border text-battlefield-muted hover:border-battlefield-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-battlefield-border bg-battlefield-panel/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold m-0">
            BROS
            <span className="text-battlefield-muted font-normal text-sm ml-2">
              Battlefield Route Optimization
            </span>
          </h1>
          <p className="text-sm text-battlefield-muted m-0 mt-1">
            Interactive battlefield graph — drag nodes, draw links, set start/goal, run A*
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 grid lg:grid-cols-[1fr_300px] gap-6">
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {toolBtn("select", "Move", "Drag nodes to reposition")}
            {toolBtn("add", "Add node", "Click empty map area")}
            {toolBtn("link", "Link", "Click two nodes to connect")}
            <span className="w-px h-6 bg-battlefield-border mx-1" />
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                pickTarget === "start"
                  ? "border-[#5ee4a8] bg-[#5ee4a8]/15 text-[#5ee4a8]"
                  : "border-battlefield-border text-battlefield-muted"
              }`}
              onClick={() => {
                setPickTarget(pickTarget === "start" ? null : "start");
                setTool("select");
              }}
            >
              Set start
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                pickTarget === "goal"
                  ? "border-[#f0a86e] bg-[#f0a86e]/15 text-[#f0a86e]"
                  : "border-battlefield-border text-battlefield-muted"
              }`}
              onClick={() => {
                setPickTarget(pickTarget === "goal" ? null : "goal");
                setTool("select");
              }}
            >
              Set goal
            </button>
            <button type="button" className="btn-secondary text-sm ml-auto" onClick={handleResetMap}>
              Reset map
            </button>
          </div>

          {map ? (
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
              onSetStart={(id) => {
                setStart(id);
                setPickTarget(null);
              }}
              onSetGoal={(id) => {
                setGoal(id);
                setPickTarget(null);
              }}
              onClearPath={() => {
                setPath([]);
                setResult(null);
              }}
            />
          ) : error ? (
            <div className="panel h-[400px] flex flex-col items-center justify-center gap-3 text-battlefield-muted">
              <p className="text-battlefield-danger text-sm font-semibold m-0">⚠ Failed to connect to API</p>
              <p className="text-xs text-battlefield-muted m-0 max-w-xs text-center">{error}</p>
              <p className="text-xs text-battlefield-muted m-0 max-w-xs text-center opacity-60">
                Make sure the backend is running at the configured API URL.
              </p>
            </div>
          ) : (
            <div className="panel h-[400px] flex items-center justify-center text-battlefield-muted">
              Loading map…
            </div>
          )}

          <p className="text-xs text-battlefield-muted m-0">
            Click nodes to inspect · Drag to move · Add nodes & links to reshape the battlefield ·
            Adjust δ to avoid civilian zones
          </p>
          {error && (
            <p className="text-battlefield-danger text-sm panel p-3 m-0">{error}</p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-battlefield-muted m-0">
              Route (A*)
            </h2>
            <p className="text-xs text-battlefield-muted m-0">
              <span className="text-[#5ee4a8] font-mono">{start}</span>
              {" → "}
              <span className="text-[#f0a86e] font-mono">{goal}</span>
            </p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={handleRun}
              disabled={loading || !map}
            >
              {loading ? "Computing…" : "Find optimal route"}
            </button>
          </div>

          {selectedNode && (
            <div className="panel p-4 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-battlefield-muted m-0">
                  Node {selectedNode.id}
                </h2>
                <button
                  type="button"
                  className="text-xs text-battlefield-danger hover:underline"
                  onClick={handleDeleteSelected}
                >
                  Delete
                </button>
              </div>
              <label className="block text-xs text-battlefield-muted">
                Terrain
                <select
                  value={selectedNode.terrain}
                  onChange={(e) =>
                    patchSelected({ terrain: e.target.value as TerrainType })
                  }
                  className="w-full mt-1 bg-battlefield-bg border border-battlefield-border rounded px-2 py-1.5 text-sm"
                >
                  {TERRAINS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-battlefield-muted">
                Threat {selectedNode.threat.toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedNode.threat}
                  onChange={(e) =>
                    patchSelected({ threat: parseFloat(e.target.value) })
                  }
                  className="w-full accent-battlefield-danger"
                />
              </label>
              <label className="block text-xs text-battlefield-muted">
                Civilian risk δ {selectedNode.civilian_risk.toFixed(2)}
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedNode.civilian_risk}
                  onChange={(e) =>
                    patchSelected({ civilian_risk: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#9b7ed8]"
                />
              </label>
            </div>
          )}

          <div className="panel p-4 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-battlefield-muted m-0">
              Cost weights
            </h2>
            {weightSlider("alpha", "α Distance")}
            {weightSlider("beta", "β Threat")}
            {weightSlider("gamma", "γ Terrain")}
            {weightSlider("delta", "δ Civilian", 6)}
          </div>

          {result && (
            <CostBreakdown
              breakdown={result.breakdown}
              algorithm="A*"
              expanded={result.expanded_nodes}
              totalCost={result.cost}
            />
          )}
        </aside>
      </main>
    </div>
  );
}


