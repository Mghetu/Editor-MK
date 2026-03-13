import { useEffect, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";

export function SettingsPanel() {
  const { doc, updateDoc, setTab } = useEditorStore();
  const [width, setWidth] = useState(String(doc.canvas.width));
  const [height, setHeight] = useState(String(doc.canvas.height));
  const [background, setBackground] = useState(doc.canvas.background);
  const [gridSize, setGridSize] = useState(String(doc.grid.size));
  const [gridColor, setGridColor] = useState(doc.grid.color);
  const [gridOpacity, setGridOpacity] = useState(String(doc.grid.opacity));

  useEffect(() => {
    setWidth(String(doc.canvas.width));
    setHeight(String(doc.canvas.height));
    setBackground(doc.canvas.background);
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

  useEffect(() => {
    setGridSize(String(doc.grid.size));
    setGridColor(doc.grid.color);
    setGridOpacity(String(doc.grid.opacity));
  }, [doc.grid.size, doc.grid.color, doc.grid.opacity]);

  const applySize = (e: React.FormEvent) => {
    e.preventDefault();
    const w = Math.max(100, Number(width) || doc.canvas.width);
    const h = Math.max(100, Number(height) || doc.canvas.height);

    updateDoc((d) => ({
      ...d,
      canvas: { ...d.canvas, width: w, height: h }
    }));
  };

  const applyBackground = (value: string) => {
    setBackground(value);
    updateDoc((d) => ({ ...d, canvas: { ...d.canvas, background: value } }));
  };

  const applyGrid = (e: React.FormEvent) => {
    e.preventDefault();
    const size = Math.min(400, Math.max(8, Number(gridSize) || doc.grid.size));
    const opacity = Math.min(0.9, Math.max(0.04, Number(gridOpacity) || doc.grid.opacity));
    updateDoc((d) => ({
      ...d,
      grid: {
        ...d.grid,
        size,
        color: gridColor,
        opacity
      }
    }));
  };

  const toggleGrid = (key: "enabled" | "snap") => {
    updateDoc((d) => ({ ...d, grid: { ...d.grid, [key]: !d.grid[key] } }));
  };

  return (
    <div className="space-y-4 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">Settings</h3>
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 text-xs text-slate-100 hover:bg-[#333]" onClick={() => setTab("select")}>Close</button>
      </div>

      <form className="space-y-3" onSubmit={applySize}>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Height</label>
          <input className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100" type="number" min={100} value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Width</label>
          <input className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100" type="number" min={100} value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <button className="w-full rounded bg-violet-600 px-3 py-2 text-white hover:bg-violet-500" type="submit">Resize</button>
      </form>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Background</label>
        <input className="h-10 w-full rounded border border-[#555] p-1" type="color" value={background} onChange={(e) => applyBackground(e.target.value)} />
      </div>

      <form className="space-y-3 rounded-lg border border-[#3f3f3f] bg-[#191919] p-3" onSubmit={applyGrid}>
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Grid</h4>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input checked={doc.grid.enabled} onChange={() => toggleGrid("enabled")} type="checkbox" />
            Show
          </label>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Spacing (px)</label>
          <input className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100" min={8} max={400} type="number" value={gridSize} onChange={(e) => setGridSize(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Grid color</label>
          <input className="h-10 w-full rounded border border-[#555] p-1" type="color" value={gridColor} onChange={(e) => setGridColor(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400">Opacity</label>
          <input className="w-full" min={0.04} max={0.9} step={0.01} type="range" value={gridOpacity} onChange={(e) => setGridOpacity(e.target.value)} />
          <div className="mt-1 text-right text-xs text-slate-400">{Number(gridOpacity).toFixed(2)}</div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input checked={doc.grid.snap} onChange={() => toggleGrid("snap")} type="checkbox" />
          Snap objects to grid when moving
        </label>

        <button className="w-full rounded bg-slate-700 px-3 py-2 text-white hover:bg-slate-600" type="submit">Apply grid settings</button>
      </form>
    </div>
  );
}
