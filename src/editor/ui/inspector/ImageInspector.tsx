import { useEffect, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";
import { exportSelectedImage } from "../../engine/export/exportImage";
import {
  applyCrop,
  cancelCrop,
  closeCropSession,
  type CropLiveInfo,
  resetCrop,
  setCropOriginPx,
  setCropPreset,
  setCustomCropSizePx,
  startCrop
} from "../../features/crop/cropController";

const PRESETS: Array<{ key: "1:1" | "9:16" | "16:9" | "300x300" | "600x250"; label: string }> = [
  { key: "1:1", label: "1:1" },
  { key: "9:16", label: "9:16" },
  { key: "16:9", label: "16:9" },
  { key: "300x300", label: "300×300px" },
  { key: "600x250", label: "600×250px" }
];

export function ImageInspector() {
  const [session, setSession] = useState<any>(null);
  const [cropImage, setCropImage] = useState<any>(null);
  const [customW, setCustomW] = useState(300);
  const [customH, setCustomH] = useState(300);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [live, setLive] = useState<CropLiveInfo | null>(null);
  const { updateDoc, doc } = useEditorStore();

  const canvas = (window as any).__editorCanvas;
  const image = canvas?.getActiveObject() as any;
  const selectedImage = image?.data?.type === "image" ? image : cropImage;

  useEffect(() => {
    if (!live) return;
    setCustomW(Math.max(1, Math.round(live.cropW)));
    setCustomH(Math.max(1, Math.round(live.cropH)));
    setCropX(Math.max(0, Math.round(live.cropX)));
    setCropY(Math.max(0, Math.round(live.cropY)));
  }, [live?.cropW, live?.cropH, live?.cropX, live?.cropY]);

  const onStartCrop = () => {
    const next = startCrop(canvas, selectedImage, setLive);
    if (!next) return;
    setSession(next);
    setCropImage(selectedImage);
    canvas.setActiveObject(next.overlay.frame);
    canvas.requestRenderAll();
  };

  const onApply = () => {
    if (!session) return;
    applyCrop(session, canvas);
    closeCropSession(canvas, session);
    setSession(null);
    setCropImage(null);
    setLive(null);
    updateDoc((d) => ({ ...d }));
  };

  const onCancel = () => {
    if (!session) return;
    cancelCrop(canvas, session);
    closeCropSession(canvas, session);
    setSession(null);
    setCropImage(null);
    setLive(null);
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
        value={selectedImage?.opacity ?? 1}
        className="mb-3 w-full"
        onChange={(e) => {
          selectedImage?.set("opacity", Number(e.target.value));
          canvas?.renderAll();
        }}
      />

      <button className="rounded border px-3 py-1" onClick={onStartCrop} disabled={!!session || !selectedImage}>
        Crop
      </button>

      <button
        className="ml-2 rounded border px-3 py-1"
        disabled={!selectedImage || selectedImage?.data?.type !== "image"}
        onClick={async () => {
          try {
            await exportSelectedImage(selectedImage, doc.export.format, doc.export.multiplier, selectedImage?.data?.name || "image");
          } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to export image.");
          }
        }}
      >
        Export Image
      </button>

      {session && (
        <div className="mt-3 space-y-3 rounded border border-slate-200 p-3">
          <p className="text-xs text-slate-600">Crop box is fixed in place. Drag only the image to change crop position.</p>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button key={preset.key} className="rounded border px-2 py-1" onClick={() => setCropPreset(session, canvas, preset.key, setLive)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input className="w-full rounded border p-1" type="number" min={1} value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
            <input className="w-full rounded border p-1" type="number" min={1} value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
            <button className="rounded border px-2 py-1" onClick={() => setCustomCropSizePx(session, canvas, customW, customH, setLive)}>
              Set size
            </button>
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
            <input className="w-full rounded border p-1" type="number" min={0} value={cropX} onChange={(e) => setCropX(Number(e.target.value))} />
            <input className="w-full rounded border p-1" type="number" min={0} value={cropY} onChange={(e) => setCropY(Number(e.target.value))} />
            <button className="rounded border px-2 py-1" onClick={() => setCropOriginPx(session, canvas, cropX, cropY, setLive)}>
              Set position
            </button>
          </div>

          {live && (
            <div className="rounded bg-slate-50 p-2 text-xs text-slate-700">
              <div>Source: {Math.round(live.sourceW)} × {Math.round(live.sourceH)} px</div>
              <div>Crop size: {Math.round(live.cropW)} × {Math.round(live.cropH)} px</div>
              <div>Crop origin: X {Math.round(live.cropX)} · Y {Math.round(live.cropY)}</div>
              <div>Frame on canvas: {Math.round(live.frameW)} × {Math.round(live.frameH)}</div>
            </div>
          )}

          <div className="space-x-2">
            <button className="rounded bg-sky-600 px-2 py-1 text-white" onClick={onApply}>
              Apply
            </button>
            <button className="rounded border px-2 py-1" onClick={onCancel}>
              Cancel
            </button>
            <button className="rounded border px-2 py-1" onClick={() => resetCrop(session, canvas, setLive)}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
