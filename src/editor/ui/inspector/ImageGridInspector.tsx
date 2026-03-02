import { useEffect, useMemo, useState } from "react";
import {
  addImagesToSelectedImageGrid,
  convertSelectedImageGridToCustom,
  refreshImageGrids,
  replaceSelectedImageGridSlot,
  shuffleSelectedImageGrid,
  swapSelectedImageGrid,
  type ImageGridData,
  updateSelectedImageGrid,
  updateSelectedImageGridSlot,
  type ImagePlacementMode
} from "../../features/imageGrid";

const getActiveGrid = (canvas: any) => {
  const obj = canvas?.getActiveObject?.() as any;
  return obj?.data?.type === "imageGrid" ? (obj.data as ImageGridData) : null;
};

export function ImageGridInspector() {
  const canvas = (window as any).__editorCanvas;
  const [grid, setGrid] = useState<ImageGridData | null>(() => getActiveGrid(canvas));
  const [slotId, setSlotId] = useState<string>("");

  useEffect(() => {
    if (!canvas) return;
    const sync = () => {
      const next = getActiveGrid(canvas);
      setGrid(next);
      setSlotId((prev) => prev || next?.slots?.[0]?.id || "");
    };
    sync();
    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);
    canvas.on("object:modified", sync);

    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", sync);
      canvas.off("object:modified", sync);
    };
  }, [canvas]);

  const slotOptions = useMemo(() => grid?.slots ?? [], [grid]);
  const selectedSlot = slotOptions.find((slot) => slot.id === slotId) ?? slotOptions[0];

  if (!grid) return null;

  const patch = (patchData: Partial<ImageGridData>) => {
    updateSelectedImageGrid(canvas, (data) => ({ ...data, ...patchData }));
    refreshImageGrids(canvas);
    setGrid(getActiveGrid(canvas));
  };

  const patchSlot = (slotPatch: Record<string, unknown>) => {
    if (!selectedSlot) return;
    updateSelectedImageGridSlot(canvas, selectedSlot.id, slotPatch as any);
    refreshImageGrids(canvas);
    setGrid(getActiveGrid(canvas));
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Image Grid</h3>

      <label className="block text-xs text-slate-300">Columns mode</label>
      <select
        className="w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100"
        value={grid.mode}
        onChange={(e) => patch({ mode: e.target.value as ImageGridData["mode"] })}
      >
        <option value="fixed">Fixed</option>
        <option value="responsive">Responsive</option>
      </select>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-300">Columns
          <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={1} max={12} value={grid.columns} onChange={(e) => patch({ columns: Math.max(1, Number(e.target.value) || 1) })} />
        </label>
        <label className="text-xs text-slate-300">Rows
          <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={1} max={12} value={grid.rows} onChange={(e) => patch({ rows: Math.max(1, Number(e.target.value) || 1) })} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-300">Gap
          <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={0} max={120} value={grid.gap} onChange={(e) => patch({ gap: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
        <label className="text-xs text-slate-300">Padding
          <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={0} max={180} value={grid.padding} onChange={(e) => patch({ padding: Math.max(0, Number(e.target.value) || 0) })} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={() => patch({ showGuides: !grid.showGuides })}>Edit grid</button>
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={() => convertSelectedImageGridToCustom(canvas)}>Convert to Custom</button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={() => shuffleSelectedImageGrid(canvas)}>Shuffle</button>
        <button className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]" onClick={() => swapSelectedImageGrid(canvas)}>Swap</button>
        <button
          className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.multiple = true;
            input.onchange = () => {
              const files = Array.from(input.files ?? []);
              if (files.length) void addImagesToSelectedImageGrid(canvas, files);
            };
            input.click();
          }}
        >
          Add images
        </button>
        <button
          className="rounded border border-[#555] bg-[#252525] px-2 py-1 hover:bg-[#333]"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = () => {
              const file = input.files?.[0];
              if (file && selectedSlot?.id) void replaceSelectedImageGridSlot(canvas, selectedSlot.id, file);
            };
            input.click();
          }}
        >
          Replace
        </button>
      </div>

      <label className="block text-xs text-slate-300">Cell</label>
      <select className="w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" value={selectedSlot?.id ?? ""} onChange={(e) => setSlotId(e.target.value)}>
        {slotOptions.map((slot, idx) => <option key={slot.id} value={slot.id}>Slot {idx + 1}</option>)}
      </select>

      {selectedSlot && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-300">Image mode
              <select className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" value={selectedSlot.imageMode ?? "cover"} onChange={(e) => patchSlot({ imageMode: e.target.value as ImagePlacementMode })}>
                <option value="cover">Cover</option>
                <option value="fit">Fit</option>
                <option value="crop">Crop</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">Corner roundness
              <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={0} max={120} value={selectedSlot.cornerRadius ?? 8} onChange={(e) => patchSlot({ cornerRadius: Math.max(0, Number(e.target.value) || 0) })} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-300">Crop scale
              <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" step="0.05" min={0.1} max={4} value={selectedSlot.cropScale ?? 1} onChange={(e) => patchSlot({ cropScale: Math.max(0.1, Number(e.target.value) || 1) })} />
            </label>
            <label className="text-xs text-slate-300">Background
              <input className="mt-1 h-10 w-full rounded border border-[#555] bg-[#252525] p-1" type="color" value={selectedSlot.backgroundColor ?? "#2c2c2c"} onChange={(e) => patchSlot({ backgroundColor: e.target.value })} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-300">Crop X offset
              <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={-500} max={500} value={selectedSlot.cropX ?? 0} onChange={(e) => patchSlot({ cropX: Number(e.target.value) || 0 })} />
            </label>
            <label className="text-xs text-slate-300">Crop Y offset
              <input className="mt-1 w-full rounded border border-[#555] bg-[#252525] p-2 text-slate-100" type="number" min={-500} max={500} value={selectedSlot.cropY ?? 0} onChange={(e) => patchSlot({ cropY: Number(e.target.value) || 0 })} />
            </label>
          </div>
        </>
      )}
    </div>
  );
}
