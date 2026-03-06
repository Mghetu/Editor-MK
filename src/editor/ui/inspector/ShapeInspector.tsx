import { applyObjectMutation } from "../../engine/history/mutator";
import { Lock, Unlock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ensureRectRadiusMetadata,
  getRectCornerRadiiPx,
  ensureShapeStrokeUniform,
  getRectRadiusPx,
  isRectLikeShape,
  normalizeRectAfterTransform,
  setRectCornerRadiiPx,
  setRectRadiusPxPreserveSize
} from "../../features/shapes/shapeGeometry";

const readRenderedSize = (obj: any) => ({
  width: Math.max(1, Math.round(Math.abs(obj?.getScaledWidth?.() ?? obj?.width ?? 1))),
  height: Math.max(1, Math.round(Math.abs(obj?.getScaledHeight?.() ?? obj?.height ?? 1)))
});

const normalizeColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const hex = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : fallback;
};

export function ShapeInspector() {
  const canvas = (window as any).__editorCanvas;
  const obj = canvas?.getActiveObject?.() as any;

  const shapeKind = obj?.data?.shapeKind as "rect" | "square" | "circle" | undefined;
  const isRectangle = shapeKind === "rect";

  const initial = useMemo(() => readRenderedSize(obj), [obj]);
  const [width, setWidth] = useState(initial.width);
  const [height, setHeight] = useState(initial.height);
  const [lockAspect, setLockAspect] = useState(true);
  const [lockCornerSides, setLockCornerSides] = useState(true);
  const [radius, setRadius] = useState(Math.max(0, Number(obj?.rx ?? 0)));
  const [cornerRadii, setCornerRadii] = useState({ tl: 0, tr: 0, br: 0, bl: 0 });
  const [fillColor, setFillColor] = useState(normalizeColor(obj?.fill, "#E2E8F0"));
  const [strokeColor, setStrokeColor] = useState(normalizeColor(obj?.stroke, "#334155"));
  const [strokeWidth, setStrokeWidth] = useState(Math.max(0, Number(obj?.strokeWidth ?? 1)));

  useEffect(() => {
    const sync = () => {
      const active = canvas?.getActiveObject?.() as any;
      if (!active || active?.data?.type !== "shape") return;

      ensureShapeStrokeUniform(active);
      ensureRectRadiusMetadata(active);

      const size = readRenderedSize(active);
      setWidth(size.width);
      setHeight(size.height);
      setRadius(Math.max(0, getRectRadiusPx(active) || 0));
      setCornerRadii(getRectCornerRadiiPx(active));
      setFillColor(normalizeColor(active?.fill, "#E2E8F0"));
      setStrokeColor(normalizeColor(active?.stroke, "#334155"));
      setStrokeWidth(Math.max(0, Number(active?.strokeWidth ?? 1)));
      canvas?.requestRenderAll?.();
    };

    sync();
    canvas?.on("object:scaling", sync);
    canvas?.on("object:modified", sync);
    canvas?.on("selection:created", sync);
    canvas?.on("selection:updated", sync);

    return () => {
      canvas?.off("object:scaling", sync);
      canvas?.off("object:modified", sync);
      canvas?.off("selection:created", sync);
      canvas?.off("selection:updated", sync);
    };
  }, [canvas]);

  if (!obj || obj?.data?.type !== "shape") return null;

  const mutate = (fn: (target: any) => void, label = "Update shape") => {
    void applyObjectMutation(canvas, obj, (target) => {
      fn(target);
      target.setCoords?.();
    }, label);
  };

  const mutateSize = (nextW: number, nextH: number) => {
    const widthPx = Math.max(1, Number.isFinite(nextW) ? nextW : 1);
    const heightPx = Math.max(1, Number.isFinite(nextH) ? nextH : 1);

    mutate((target) => {
      if (isRectLikeShape(target)) {
        const signX = (target.scaleX ?? 1) < 0 ? -1 : 1;
        const signY = (target.scaleY ?? 1) < 0 ? -1 : 1;
        Object.assign(target, { width: widthPx, height: heightPx, scaleX: signX, scaleY: signY });
        normalizeRectAfterTransform(target);
      } else {
        const baseW = Math.max(1, Number(target.width ?? 1));
        const baseH = Math.max(1, Number(target.height ?? 1));
        const scaleSignX = (target.scaleX ?? 1) < 0 ? -1 : 1;
        const scaleSignY = (target.scaleY ?? 1) < 0 ? -1 : 1;
        Object.assign(target, {
          scaleX: scaleSignX * (widthPx / baseW),
          scaleY: scaleSignY * (heightPx / baseH),
          strokeUniform: true
        });
      }
    }, "Resize shape");

    setWidth(Math.round(widthPx));
    setHeight(Math.round(heightPx));
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
    mutate((target) => {
      setRectRadiusPxPreserveSize(target, next);
    }, "Set corner radius");
    setRadius(next);
    setCornerRadii({ tl: next, tr: next, br: next, bl: next });
    setLockCornerSides(true);
  };

  const onCornerRadiusSideChange = (key: "tl" | "tr" | "br" | "bl", value: number) => {
    const next = Math.max(0, Number.isFinite(value) ? value : 0);
    const nextRadii = { ...cornerRadii, [key]: next };
    mutate((target) => {
      setRectCornerRadiiPx(target, nextRadii);
      normalizeRectAfterTransform(target);
    }, "Set corner radii");
    const normalized = getRectCornerRadiiPx(obj);
    setCornerRadii(normalized);
    setRadius(Math.max(normalized.tl, normalized.tr, normalized.br, normalized.bl));
  };

  const onFillColorChange = (value: string) => {
    setFillColor(value);
    mutate((target) => {
      target.fill = value;
    }, "Set fill color");
  };

  const onStrokeColorChange = (value: string) => {
    setStrokeColor(value);
    mutate((target) => {
      target.stroke = value;
    }, "Set stroke color");
  };

  const onStrokeWidthChange = (value: number) => {
    const next = Math.max(0, Number.isFinite(value) ? value : 0);
    setStrokeWidth(next);
    mutate((target) => {
      target.strokeWidth = next;
      target.strokeUniform = true;
    }, "Set stroke width");
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="font-semibold text-slate-100">Shape</h3>

      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Width</label>
          <input
            type="number"
            min={1}
            value={width}
            className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
            onChange={(e) => onWidthChange(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Height</label>
          <input
            type="number"
            min={1}
            value={height}
            className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
            onChange={(e) => onHeightChange(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <button
            className={`rounded border border-[#555] p-2 ${lockAspect ? "bg-[#3a3a3a]" : "bg-[#252525]"}`}
            onClick={() => setLockAspect((v) => !v)}
            title="Constrain proportions"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Fill color</label>
          <input type="color" value={fillColor} className="h-10 w-full rounded border border-[#555] p-1" onChange={(e) => onFillColorChange(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Stroke color</label>
          <input
            type="color"
            value={strokeColor}
            className="h-10 w-full rounded border border-[#555] p-1"
            onChange={(e) => onStrokeColorChange(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">Stroke width</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={strokeWidth}
          className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
          onChange={(e) => onStrokeWidthChange(Number(e.target.value))}
        />
      </div>

      {isRectangle && (
        <div className="space-y-2">
          <label className="mb-1 block text-xs text-slate-400">Corner radius (all)</label>
          <input
            type="number"
            min={0}
            value={radius}
            className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
            onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          />

          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs text-slate-400">Individual corners</p>
            <button
              type="button"
              className={`rounded border border-[#555] p-1.5 ${lockCornerSides ? "bg-[#3a3a3a]" : "bg-[#252525]"}`}
              title={lockCornerSides ? "Unlock individual corner editing" : "Lock individual corner editing"}
              onClick={() => setLockCornerSides((prev) => !prev)}
            >
              {lockCornerSides ? <Lock size={12} /> : <Unlock size={12} />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">Top-left
              <input
                type="number"
                min={0}
                value={cornerRadii.tl}
                className="mt-1 w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
                disabled={lockCornerSides}
                onChange={(e) => onCornerRadiusSideChange("tl", Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-400">Top-right
              <input
                type="number"
                min={0}
                value={cornerRadii.tr}
                className="mt-1 w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
                disabled={lockCornerSides}
                onChange={(e) => onCornerRadiusSideChange("tr", Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-400">Bottom-right
              <input
                type="number"
                min={0}
                value={cornerRadii.br}
                className="mt-1 w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
                disabled={lockCornerSides}
                onChange={(e) => onCornerRadiusSideChange("br", Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-400">Bottom-left
              <input
                type="number"
                min={0}
                value={cornerRadii.bl}
                className="mt-1 w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
                disabled={lockCornerSides}
                onChange={(e) => onCornerRadiusSideChange("bl", Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}

      {isRectLikeShape(obj) && <p className="text-xs text-slate-500">Aspect ratio lock defaults to on.</p>}
    </div>
  );
}
