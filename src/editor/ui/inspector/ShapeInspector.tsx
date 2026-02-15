import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const readRenderedSize = (obj: any) => ({
  width: Math.max(1, Math.round(Math.abs(obj?.getScaledWidth?.() ?? obj?.width ?? 1))),
  height: Math.max(1, Math.round(Math.abs(obj?.getScaledHeight?.() ?? obj?.height ?? 1)))
});

export function ShapeInspector() {
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject?.() as any;

  const shapeKind = obj?.data?.shapeKind as "rect" | "square" | "circle" | undefined;
  const isRectLike = shapeKind === "rect" || shapeKind === "square";
  const isRectangle = shapeKind === "rect";

  const initial = useMemo(() => readRenderedSize(obj), [obj]);
  const [width, setWidth] = useState(initial.width);
  const [height, setHeight] = useState(initial.height);
  const [lockAspect, setLockAspect] = useState(true);
  const [radius, setRadius] = useState(Math.max(0, Number(obj?.rx ?? 0)));

  useEffect(() => {
    const sync = () => {
      const active = canvas?.getActiveObject?.() as any;
      if (!active || active?.data?.type !== "shape") return;
      const size = readRenderedSize(active);
      setWidth(size.width);
      setHeight(size.height);
      setRadius(Math.max(0, Number(active?.rx ?? 0)));
    };

    sync();
    canvas?.on("object:scaling", sync);
    canvas?.on("object:modified", sync);
    canvas?.on("selection:updated", sync);

    return () => {
      canvas?.off("object:scaling", sync);
      canvas?.off("object:modified", sync);
      canvas?.off("selection:updated", sync);
    };
  }, [canvas]);

  if (!obj || obj?.data?.type !== "shape") return null;

  const mutateSize = (nextW: number, nextH: number) => {
    const baseW = Math.max(1, Number(obj.width ?? 1));
    const baseH = Math.max(1, Number(obj.height ?? 1));
    const scaleSignX = (obj.scaleX ?? 1) < 0 ? -1 : 1;
    const scaleSignY = (obj.scaleY ?? 1) < 0 ? -1 : 1;

    obj.set({
      scaleX: scaleSignX * (Math.max(1, nextW) / baseW),
      scaleY: scaleSignY * (Math.max(1, nextH) / baseH)
    });
    obj.setCoords();
    canvas?.requestRenderAll?.();
    setWidth(Math.max(1, Math.round(nextW)));
    setHeight(Math.max(1, Math.round(nextH)));
  };

  const onWidthChange = (value: number) => {
    const nextW = Math.max(1, Number.isFinite(value) ? value : 1);
    if (lockAspect) {
      const ratio = Math.max(0.0001, height / Math.max(1, width));
      mutateSize(nextW, Math.round(nextW * ratio));
      return;
    }
    mutateSize(nextW, height);
  };

  const onHeightChange = (value: number) => {
    const nextH = Math.max(1, Number.isFinite(value) ? value : 1);
    if (lockAspect) {
      const ratio = Math.max(0.0001, width / Math.max(1, height));
      mutateSize(Math.round(nextH * ratio), nextH);
      return;
    }
    mutateSize(width, nextH);
  };

  const onCornerRadiusChange = (value: number) => {
    const next = Math.max(0, Number.isFinite(value) ? value : 0);
    obj.set({ rx: next, ry: next });
    obj.setCoords();
    canvas?.requestRenderAll?.();
    setRadius(next);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Shape</h3>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-600">Width</label>
          <input
            type="number"
            min={1}
            value={width}
            className="w-full rounded border p-2"
            onChange={(e) => onWidthChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-600">Height</label>
          <input
            type="number"
            min={1}
            value={height}
            className="w-full rounded border p-2"
            onChange={(e) => onHeightChange(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <button
            className={`rounded border p-2 ${lockAspect ? "bg-slate-100" : ""}`}
            onClick={() => setLockAspect((v) => !v)}
            title="Constrain proportions"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {isRectangle && (
        <div>
          <label className="mb-1 block text-xs text-slate-600">Corner radius</label>
          <input
            type="number"
            min={0}
            value={radius}
            className="w-full rounded border p-2"
            onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          />
        </div>
      )}

      {isRectLike && <p className="text-xs text-slate-500">Aspect ratio lock defaults to on.</p>}
    </div>
  );
}
