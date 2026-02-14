import { useState } from "react";
import { applyCrop, cancelCrop, startCrop, type CropMode } from "../../features/crop/cropController";
import { presets } from "../../features/crop/cropMath";

export function ImageInspector() {
  const [cropSession, setCropSession] = useState<any>(null);
  const [mode, setMode] = useState<CropMode>("rect");
  const [customW, setCustomW] = useState(400);
  const [customH, setCustomH] = useState(400);

  const canvas = (window as any).__editorCanvas;
  const image = canvas?.getActiveObject() as any;

  const resizeFrame = (w: number, h: number) => {
    if (!cropSession?.frame) return;
    cropSession.frame.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
    canvas.renderAll();
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">Image</h3>
      <button className="rounded border px-3 py-1" onClick={() => setCropSession(startCrop(canvas, image))}>Crop</button>
      {cropSession && (
        <div className="mt-3 space-y-2">
          <div className="space-x-2">
            <button className="rounded border px-2 py-1" onClick={() => setMode("rect")}>Rect</button>
            <button className="rounded border px-2 py-1" onClick={() => setMode("circle")}>Circle</button>
          </div>
          <div className="space-x-2">
            <button className="rounded border px-2 py-1" onClick={() => resizeFrame(presets.p400.w, presets.p400.h)}>400×400</button>
            <button className="rounded border px-2 py-1" onClick={() => resizeFrame(presets.p600x300.w, presets.p600x300.h)}>600×300</button>
            <button className="rounded border px-2 py-1" onClick={() => resizeFrame(presets.p350x200.w, presets.p350x200.h)}>350×200</button>
          </div>
          <div className="flex gap-2">
            <input className="w-20 rounded border p-1" type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
            <input className="w-20 rounded border p-1" type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
            <button className="rounded border px-2 py-1" onClick={() => resizeFrame(customW, customH)}>Set</button>
          </div>
          <div className="space-x-2">
            <button className="rounded bg-sky-600 px-2 py-1 text-white" onClick={() => { applyCrop(image, cropSession.frame, mode); canvas.remove(cropSession.frame); setCropSession(null); canvas.renderAll(); }}>Apply</button>
            <button className="rounded border px-2 py-1" onClick={() => { cancelCrop(canvas, image, cropSession, cropSession.frame); setCropSession(null); canvas.renderAll(); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
