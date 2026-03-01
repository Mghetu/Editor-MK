import { useEffect, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";

export function SettingsPanel() {
  const { doc, updateDoc, setTab } = useEditorStore();
  const [width, setWidth] = useState(String(doc.canvas.width));
  const [height, setHeight] = useState(String(doc.canvas.height));
  const [background, setBackground] = useState(doc.canvas.background);

  useEffect(() => {
    setWidth(String(doc.canvas.width));
    setHeight(String(doc.canvas.height));
    setBackground(doc.canvas.background);
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

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
    </div>
  );
}
