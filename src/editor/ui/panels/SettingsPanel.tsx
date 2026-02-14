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

    const canvas = (window as any).__editorCanvas;
    if (canvas) {
      canvas.setWidth(w);
      canvas.setHeight(h);
      canvas.renderAll();
    }
  };

  const applyBackground = (value: string) => {
    setBackground(value);
    updateDoc((d) => ({ ...d, canvas: { ...d.canvas, background: value } }));

    const canvas = (window as any).__editorCanvas;
    if (canvas) {
      canvas.backgroundColor = value;
      canvas.renderAll();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Settings</h3>
        <button className="rounded border px-2 py-1 text-xs" onClick={() => setTab("select")}>Close</button>
      </div>

      <form className="space-y-3" onSubmit={applySize}>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Height</label>
          <input className="w-full rounded border p-2" type="number" min={100} value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Width</label>
          <input className="w-full rounded border p-2" type="number" min={100} value={width} onChange={(e) => setWidth(e.target.value)} />
        </div>
        <button className="w-full rounded bg-slate-900 px-3 py-2 text-white" type="submit">Resize</button>
      </form>

      <div>
        <label className="mb-1 block text-xs text-slate-600">Background</label>
        <input className="h-10 w-full rounded border p-1" type="color" value={background} onChange={(e) => applyBackground(e.target.value)} />
      </div>
    </div>
  );
}
