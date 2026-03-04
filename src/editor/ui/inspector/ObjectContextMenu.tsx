import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignStartVertical,
  AlignRight,
  Lock,
  Unlock
} from "lucide-react";
import { useEffect, useState } from "react";
import { Gradient } from "fabric";
import { ColorStudio, type ColorSelection } from "../color/ColorStudio";
import { applyObjectMutation } from "../../engine/history/mutator";

type AxisAlignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

type ObjectSnapshot = {
  width: number;
  height: number;
  opacity: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
};

const normalizeColor = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(candidate)) {
    if (candidate.length === 4) {
      const [, r, g, b] = candidate;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return candidate;
  }
  return fallback;
};

const getActiveObject = () => {
  const canvas = (window as any).__editorCanvas;
  return {
    canvas,
    obj: canvas?.getActiveObject?.() as any
  };
};

const isCropFrameLike = (obj: any) => Boolean(obj?.data?.isCropOverlay && obj?.data?.type === "crop-frame");

const getRenderedDimension = (obj: any, axis: "width" | "height") => {
  const scaleKey = axis === "width" ? "scaleX" : "scaleY";
  const sizeKey = axis;
  return Math.max(1, Number(obj?.[sizeKey] ?? 1) * Math.abs(Number(obj?.[scaleKey] ?? 1)));
};

const readSnapshot = (): ObjectSnapshot | null => {
  const { obj } = getActiveObject();
  if (!obj) return null;

  const width = isCropFrameLike(obj)
    ? getRenderedDimension(obj, "width")
    : Number(obj.getScaledWidth?.() ?? obj.width ?? 1);
  const height = isCropFrameLike(obj)
    ? getRenderedDimension(obj, "height")
    : Number(obj.getScaledHeight?.() ?? obj.height ?? 1);

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
    opacity: Math.max(0, Math.min(1, Number(obj.opacity ?? 1))),
    fill: normalizeColor(obj.fill, "#e2e8f0"),
    stroke: normalizeColor(obj.stroke, "#334155"),
    strokeWidth: Math.max(0, Number(obj.strokeWidth ?? 1))
  };
};

const getObjectBounds = (obj: any) => {
  const bounds = obj?.getBoundingRect?.(true, true) ?? obj?.getBoundingRect?.();
  if (!bounds) return null;
  return {
    left: Number(bounds.left ?? 0),
    top: Number(bounds.top ?? 0),
    width: Math.max(0, Number(bounds.width ?? 0)),
    height: Math.max(0, Number(bounds.height ?? 0))
  };
};

const isTextboxLike = (obj: any) => {
  const type = String(obj?.type ?? "").toLowerCase();
  return type === "textbox";
};

const readColorSelection = (obj: any, key: "fill" | "stroke", fallback: string): ColorSelection => {
  const value = obj?.[key];
  if (!value || typeof value === "string") {
    return { mode: "solid", hex: normalizeColor(value, fallback) };
  }

  const stopsRaw = Array.isArray(value.colorStops) ? value.colorStops : [];
  const stops = stopsRaw
    .map((stop: any, index: number) => ({
      offset: Number.isFinite(Number(stop?.offset)) ? Number(stop.offset) : index,
      color: normalizeColor(stop?.color, fallback)
    }))
    .sort((a: any, b: any) => a.offset - b.offset)
    .map((stop: any, index: number, arr: any[]) => ({
      offset: arr.length <= 1 ? index : Math.max(0, Math.min(1, stop.offset)),
      color: stop.color
    }));

  const gradientType = value?.type === "radial" ? "radial" : "linear";
  const coords = value?.coords ?? {};
  const x1 = Number(coords.x1 ?? 0);
  const y1 = Number(coords.y1 ?? 0);
  const x2 = Number(coords.x2 ?? 1);
  const y2 = Number(coords.y2 ?? 0);
  const angle = Math.round((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);

  if (!stops.length) return { mode: "solid", hex: normalizeColor(value?.color, fallback) };

  return {
    mode: "gradient",
    gradient: {
      type: gradientType,
      angle,
      stops
    }
  };
};

const toPreviewBackground = (selection: ColorSelection) => {
  if (selection.mode === "solid") return selection.hex;
  const sorted = selection.gradient.stops.slice().sort((a, b) => a.offset - b.offset);
  const stops = sorted.map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`).join(", ");
  return selection.gradient.type === "radial"
    ? `radial-gradient(circle, ${stops})`
    : `linear-gradient(${selection.gradient.angle}deg, ${stops})`;
};

export function ObjectContextMenu() {
  const [snapshot, setSnapshot] = useState<ObjectSnapshot | null>(() => readSnapshot());
  const [lockAspect, setLockAspect] = useState(true);
  const [openStudio, setOpenStudio] = useState<"fill" | "stroke" | null>(null);
  const [fillSelection, setFillSelection] = useState<ColorSelection>({ mode: "solid", hex: "#e2e8f0" });
  const [strokeSelection, setStrokeSelection] = useState<ColorSelection>({ mode: "solid", hex: "#334155" });

  const applyColorSelection = (property: "fill" | "stroke", value: ColorSelection) => {
    mutate((obj) => {
      if (value.mode === "solid") {
        obj.set(property, value.hex);
        return;
      }

      const radians = (Number(value.gradient.angle ?? 0) * Math.PI) / 180;
      const x2 = (Math.cos(radians) + 1) / 2;
      const y2 = (Math.sin(radians) + 1) / 2;

      obj.set(
        property,
        new Gradient({
          type: value.gradient.type,
          gradientUnits: "percentage",
          coords: {
            x1: 0,
            y1: 0,
            x2,
            y2,
            r1: 0,
            r2: 1
          },
          colorStops: value.gradient.stops
        })
      );
    }, `Set ${property}`);
  };

  useEffect(() => {
    const { canvas } = getActiveObject();
    if (!canvas) return;

    const sync = () => {
      const next = readSnapshot();
      setSnapshot(next);
      const { obj } = getActiveObject();
      if (!obj) return;
      setFillSelection(readColorSelection(obj, "fill", next?.fill ?? "#e2e8f0"));
      setStrokeSelection(readColorSelection(obj, "stroke", next?.stroke ?? "#334155"));
    };
    sync();

    canvas.on("selection:created", sync);
    canvas.on("selection:updated", sync);
    canvas.on("selection:cleared", sync);
    canvas.on("object:moving", sync);
    canvas.on("object:scaling", sync);
    canvas.on("object:modified", sync);

    return () => {
      canvas.off("selection:created", sync);
      canvas.off("selection:updated", sync);
      canvas.off("selection:cleared", sync);
      canvas.off("object:moving", sync);
      canvas.off("object:scaling", sync);
      canvas.off("object:modified", sync);
    };
  }, []);

  const refreshSnapshotState = () => {
    const next = readSnapshot();
    setSnapshot(next);
    const { obj } = getActiveObject();
    if (!obj) return;
    setFillSelection(readColorSelection(obj, "fill", next?.fill ?? "#e2e8f0"));
    setStrokeSelection(readColorSelection(obj, "stroke", next?.stroke ?? "#334155"));
  };

  const mutate = (fn: (obj: any, canvas: any) => void, label = "Update object") => {
    const { canvas, obj } = getActiveObject();
    if (!obj || !canvas) return;
    void applyObjectMutation(canvas, obj, fn, label).finally(() => {
      refreshSnapshotState();
    });
  };

  const align = (position: AxisAlignment) => {
    mutate((obj, canvas) => {
      const bounds = getObjectBounds(obj);
      if (!bounds) return;

      const canvasWidth = Number(canvas.getWidth?.() ?? canvas.width ?? 0);
      const canvasHeight = Number(canvas.getHeight?.() ?? canvas.height ?? 0);

      let deltaX = 0;
      let deltaY = 0;

      if (position === "left") deltaX = -bounds.left;
      if (position === "center") deltaX = canvasWidth / 2 - (bounds.left + bounds.width / 2);
      if (position === "right") deltaX = canvasWidth - (bounds.left + bounds.width);
      if (position === "top") deltaY = -bounds.top;
      if (position === "middle") deltaY = canvasHeight / 2 - (bounds.top + bounds.height / 2);
      if (position === "bottom") deltaY = canvasHeight - (bounds.top + bounds.height);

      obj.set({
        left: Number(obj.left ?? 0) + deltaX,
        top: Number(obj.top ?? 0) + deltaY
      });
    }, `Align ${position}`);
  };

  const updateSize = (key: "width" | "height", nextValue: number) => {
    if (!snapshot) return;
    const sanitized = Math.max(1, Number.isFinite(nextValue) ? nextValue : 1);

    mutate((obj) => {
      if (isCropFrameLike(obj)) {
        const nextWidth = key === "width" ? sanitized : lockAspect ? Math.max(1, Math.round((sanitized * snapshot.width) / Math.max(1, snapshot.height))) : snapshot.width;
        const nextHeight = key === "height" ? sanitized : lockAspect ? Math.max(1, Math.round((sanitized * snapshot.height) / Math.max(1, snapshot.width))) : snapshot.height;

        obj.set({
          width: Math.max(1, nextWidth),
          height: Math.max(1, nextHeight),
          scaleX: Number(obj.scaleX ?? 1) < 0 ? -1 : 1,
          scaleY: Number(obj.scaleY ?? 1) < 0 ? -1 : 1
        });
        return;
      }

      if (isTextboxLike(obj) && key === "width") {
        obj.set({
          width: sanitized,
          scaleX: Number(obj.scaleX ?? 1) < 0 ? -1 : 1,
          strokeUniform: true
        });
        return;
      }

      const currentW = Math.max(1, Number(obj.getScaledWidth?.() ?? obj.width ?? 1));
      const currentH = Math.max(1, Number(obj.getScaledHeight?.() ?? obj.height ?? 1));

      const targetW = key === "width" ? sanitized : lockAspect ? Math.max(1, Math.round((sanitized * currentW) / currentH)) : currentW;
      const targetH = key === "height" ? sanitized : lockAspect ? Math.max(1, Math.round((sanitized * currentH) / currentW)) : currentH;

      const baseW = Math.max(1, Number(obj.width ?? currentW));
      const baseH = Math.max(1, Number(obj.height ?? currentH));
      const signX = Number(obj.scaleX ?? 1) < 0 ? -1 : 1;
      const signY = Number(obj.scaleY ?? 1) < 0 ? -1 : 1;

      obj.set({
        scaleX: signX * (targetW / baseW),
        scaleY: signY * (targetH / baseH),
        strokeUniform: true
      });
    }, `Set ${key}`);
  };

  if (!snapshot) return null;

  return (
    <div className="space-y-3 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Quick actions</h3>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Align</p>
        <div className="grid grid-cols-3 gap-1">
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align left" onClick={() => align("left")}><AlignLeft size={14} /></button>
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align horizontal center" onClick={() => align("center")}><AlignCenterHorizontal size={14} /></button>
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align right" onClick={() => align("right")}><AlignRight size={14} /></button>
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align top" onClick={() => align("top")}><AlignStartVertical size={14} /></button>
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align vertical center" onClick={() => align("middle")}><AlignCenterVertical size={14} /></button>
          <button className="rounded border border-[#555] bg-[#252525] p-2 hover:bg-[#333]" title="Align bottom" onClick={() => align("bottom")}><AlignEndVertical size={14} /></button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-400">Dimensions</p>
          <button
            className={`rounded border border-[#555] p-1.5 ${lockAspect ? "bg-[#3a3a3a]" : "bg-[#252525]"}`}
            title="Constrain proportions"
            onClick={() => setLockAspect((prev) => !prev)}
          >
            {lockAspect ? <Lock size={12} /> : <Unlock size={12} />}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min={1}
            value={snapshot.width}
            className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
            onChange={(e) => updateSize("width", Number(e.target.value))}
          />
          <input
            type="number"
            min={1}
            value={snapshot.height}
            className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
            onChange={(e) => updateSize("height", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Opacity ({Math.round(snapshot.opacity * 100)}%)</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snapshot.opacity}
          className="w-full"
          onChange={(e) => mutate((obj) => obj.set("opacity", Number(e.target.value)), "Set opacity")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Fill</label>
          <button
            className="h-10 w-full rounded border border-[#555]"
            style={{ background: toPreviewBackground(fillSelection) }}
            onClick={() => setOpenStudio((prev) => (prev === "fill" ? null : "fill"))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Stroke</label>
          <button
            className="h-10 w-full rounded border border-[#555]"
            style={{ background: toPreviewBackground(strokeSelection) }}
            onClick={() => setOpenStudio((prev) => (prev === "stroke" ? null : "stroke"))}
          />
        </div>
      </div>

      {openStudio === "fill" && (
        <ColorStudio
          value={fillSelection}
          onChange={(value) => {
            setFillSelection(value);
            applyColorSelection("fill", value);
          }}
        />
      )}

      {openStudio === "stroke" && (
        <ColorStudio
          value={strokeSelection}
          onChange={(value) => {
            setStrokeSelection(value);
            applyColorSelection("stroke", value);
          }}
        />
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-400">Stroke width</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={snapshot.strokeWidth}
          className="w-full rounded border border-[#555] bg-[#141414] p-2 text-slate-100"
          onChange={(e) => mutate((obj) => obj.set({ strokeWidth: Math.max(0, Number(e.target.value)), strokeUniform: true }), "Set stroke width")}
        />
      </div>
    </div>
  );
}
