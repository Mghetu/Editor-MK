import { useEffect, useState } from "react";
import { useEditorStore } from "../../state/useEditorStore";
import {
  applyCrop,
  cancelCrop,
  CROP_RATIO_PRESETS,
  closeCropSession,
  resetCrop,
  setCropRatio,
  setCropSizeFromSourcePixels,
  startCrop,
  type CropLiveInfo
} from "../../features/crop/cropController";

export function ImageInspector() {
  const [session, setSession] = useState<any>(null);
  const [cropImage, setCropImage] = useState<any>(null);
  const [ratioId, setRatioId] = useState("1:1");
  const [customW, setCustomW] = useState(400);
  const [customH, setCustomH] = useState(400);
  const [live, setLive] = useState<CropLiveInfo | null>(null);
  const { updateDoc } = useEditorStore();

  const canvas = (window as any).__editorCanvas;
  const active = canvas?.getActiveObject() as any;
  const selectedImage = active?.data?.type === "image" ? active : cropImage;

  useEffect(() => {
    return () => {
      if (!canvas || !session) return;
      cancelCrop(canvas, session);
      closeCropSession(canvas, session);
    };
  }, [canvas, session]);

  const onStartCrop = () => {
    if (!canvas || !selectedImage || selectedImage.data?.type !== "image") return;
    const next = startCrop(canvas, selectedImage, setLive);
    if (!next) return;
    setSession(next);
    setCropImage(selectedImage);
    setRatioId("1:1");
    setCropRatio(next, 1, canvas);
    canvas.renderAll();
  };

  const onApply = () => {
    if (!session) return;
    applyCrop(session, canvas);
    updateDoc((d) => ({ ...d }));
    closeCropSession(canvas, session);
    setSession(null);
    setCropImage(null);
    setLive(null);
  };

  const onCancel = () => {
    if (!session) return;
    cancelCrop(canvas, session);
    closeCropSession(canvas, session);
    setSession(null);
    setCropImage(null);
    setLive(null);
  };

  const onReset = () => {
    if (!session) return;
    resetCrop(session, canvas);
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
          if (session?.previewImage) {
            session.previewImage.set("opacity", Number(e.target.value));
          }
          canvas?.renderAll();
        }}
      />
      <button className="rounded border px-3 py-1" onClick={onStartCrop} disabled={!selectedImage || !!session}>
        Crop
      </button>
      {session && (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            {CROP_RATIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                className={`rounded border px-2 py-1 ${ratioId === preset.id ? "bg-sky-50" : ""}`}
                onClick={() => {
                  setRatioId(preset.id);
                  setCropRatio(session, preset.ratio, canvas);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input className="w-24 rounded border p-1" type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} />
            <span>×</span>
            <input className="w-24 rounded border p-1" type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
            <span className="text-xs text-slate-500">px (source)</span>
            <button className="rounded border px-2 py-1" onClick={() => setCropSizeFromSourcePixels(session, canvas, customW, customH)}>
              Set
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
            <button className="rounded border px-2 py-1" onClick={onReset}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
