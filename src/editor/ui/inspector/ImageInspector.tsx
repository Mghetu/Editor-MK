import { useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";
import {
  applyCrop,
  cancelCrop,
  closeCropSession,
  cropCanvasToFrame,
  resizeCropFrame,
  startCrop,
  type CropMode
} from "../../features/crop/cropController";
import { presets } from "../../features/crop/cropMath";

export function ImageInspector() {
  const [session, setSession] = useState<any>(null);
  const [mode, setMode] = useState<CropMode>("rect");
  const [customW, setCustomW] = useState(400);
  const [customH, setCustomH] = useState(400);
  const { updateDoc } = useEditorStore();

  const canvas = (window as any).__editorCanvas;
  const image = canvas?.getActiveObject() as any;

  const onStartCrop = () => {
    const next = startCrop(canvas, image);
    if (next) {
      setSession(next);
      canvas.setActiveObject(next.overlay.frame);
      canvas.renderAll();
    }
  };

  const onApply = () => {
    if (!session) return;
    const bounds = applyCrop(session, mode);
    cropCanvasToFrame(canvas, bounds);
    updateDoc((d) => ({
      ...d,
      canvas: { ...d.canvas, width: Math.round(bounds.width), height: Math.round(bounds.height) }
    }));
    closeCropSession(canvas, session);
    setSession(null);
  };

  const onCancel = () => {
    if (!session) return;
    cancelCrop(canvas, session);
    closeCropSession(canvas, session);
    setSession(null);
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">Image</h3>
      <label className="mb-1 block text-xs">Opacity</label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        defaultValue={image?.opacity ?? 1}
        className="mb-3 w-full"
        onChange={(e) => {
          image?.set("opacity", Number(e.target.value));
          canvas.renderAll();
        }}
      />
      <button className="rounded border px-3 py-1" onClick={onStartCrop}>
        Crop
      </button>
      {session && (
        <div className="mt-3 space-y-2">
          <div className="space-x-2">
            <button className={`rounded border px-2 py-1 ${mode === "rect" ? "bg-sky-50" : ""}`} onClick={() => setMode("rect")}>Rect</button>
            <button className={`rounded border px-2 py-1 ${mode === "circle" ? "bg-sky-50" : ""}`} onClick={() => setMode("circle")}>Circle</button>
          </div>
          <div className="space-x-2">
            <button className="rounded border px-2 py-1" onClick={() => resizeCropFrame(session, canvas, presets.p400.w, presets.p400.h)}>400×400</button>
            <button className="rounded border px-2 py-1" onClick={() => resizeCropFrame(session, canvas, presets.p600x300.w, presets.p600x300.h)}>600×300</button>
            <button className="rounded border px-2 py-1" onClick={() => resizeCropFrame(session, canvas, presets.p350x200.w, presets.p350x200.h)}>350×200</button>
          </div>
          <div className="flex gap-2">
            <input className="w-20 rounded border p-1" type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
            <input className="w-20 rounded border p-1" type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
            <button className="rounded border px-2 py-1" onClick={() => resizeCropFrame(session, canvas, customW, customH)}>Set</button>
          </div>
          <p className="text-xs text-slate-500">Apply will resize the canvas to the crop frame.</p>
          <div className="space-x-2">
            <button className="rounded bg-sky-600 px-2 py-1 text-white" onClick={onApply}>Apply</button>
            <button className="rounded border px-2 py-1" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
