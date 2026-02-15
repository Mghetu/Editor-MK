import { useEffect, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";
import {
  applyCrop,
  cancelCrop,
  CROP_RATIO_PRESETS,
  closeCropSession,
  CROP_RATIO_PRESETS,
  type CropLiveInfo,
  resetCrop,
  setCropPreset,
  setCustomCropSizePx,
  startCrop
} from "../../features/crop/cropController";

export function ImageInspector() {
  const [session, setSession] = useState<any>(null);
  const [customW, setCustomW] = useState(300);
  const [customH, setCustomH] = useState(300);
  const [live, setLive] = useState<CropLiveInfo | null>(null);
  const { updateDoc } = useEditorStore();

  const canvas = (window as any).__editorCanvas;
  const active = canvas?.getActiveObject() as any;
  const selectedImage = active?.data?.type === "image" ? active : cropImage;

  const clearCropUi = () => {
    setSession(null);
    setCropImage(null);
    setLive(null);
  };

  const onStartCrop = () => {
    const next = startCrop(canvas, image, setLive);
    if (!next) return;
    setSession(next);
    canvas.setActiveObject(next.overlay.frame);
    canvas.requestRenderAll();
  };

  const onApply = () => {
    if (!session) return;
    applyCrop(session, canvas);
    closeCropSession(canvas, session);
    setSession(null);
    setLive(null);
    updateDoc((d) => ({ ...d }));
  };

  const onCancel = () => {
    if (!session) return;
    cancelCrop(canvas, session);
    closeCropSession(canvas, session);
    setSession(null);
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
        value={image?.opacity ?? 1}
        className="mb-3 w-full"
        onChange={(e) => {
          image?.set("opacity", Number(e.target.value));
          canvas?.renderAll();
        }}
      />

      <button className="rounded border px-3 py-1" onClick={onStartCrop} disabled={!!session || !image}>
        Crop
      </button>

      {session && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {CROP_RATIO_PRESETS.map((preset) => (
              <button key={preset.key} className="rounded border px-2 py-1" onClick={() => setCropPreset(session, canvas, preset.key, setLive)}>
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input className="w-24 rounded border p-1" type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
            <span>×</span>
            <input className="w-24 rounded border p-1" type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
            <button className="rounded border px-2 py-1" onClick={() => setCustomCropSizePx(session, canvas, customW, customH, setLive)}>
              Set px
            </button>
          </div>

          {live && (
            <div className="rounded bg-slate-50 p-2 text-xs text-slate-700">
              <div>
                Crop: {Math.round(live.cropW)} × {Math.round(live.cropH)} px
              </div>
              <div>
                Frame: {Math.round(live.frameW)} × {Math.round(live.frameH)}
              </div>
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
