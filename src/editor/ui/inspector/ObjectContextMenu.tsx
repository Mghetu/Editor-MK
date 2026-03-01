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

const readSnapshot = (): ObjectSnapshot | null => {
  const { obj } = getActiveObject();
  if (!obj) return null;

  return {
    width: Math.max(1, Math.round(obj.getScaledWidth?.() ?? obj.width ?? 1)),
    height: Math.max(1, Math.round(obj.getScaledHeight?.() ?? obj.height ?? 1)),
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

export function ObjectContextMenu() {
  const [snapshot, setSnapshot] = useState<ObjectSnapshot | null>(() => readSnapshot());
  const [lockAspect, setLockAspect] = useState(true);

  useEffect(() => {
    const { canvas } = getActiveObject();
    if (!canvas) return;

    const sync = () => setSnapshot(readSnapshot());
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

  const mutate = (fn: (obj: any, canvas: any) => void) => {
    const { canvas, obj } = getActiveObject();
    if (!obj || !canvas) return;
    fn(obj, canvas);
    obj.setCoords?.();
    canvas.requestRenderAll?.();
    setSnapshot(readSnapshot());
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
    });
  };

  const updateSize = (key: "width" | "height", nextValue: number) => {
    if (!snapshot) return;
    const sanitized = Math.max(1, Number.isFinite(nextValue) ? nextValue : 1);

    mutate((obj) => {
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
    });
  };

  if (!snapshot) return null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</h3>

      <div>
        <p className="mb-2 text-xs font-medium text-slate-600">Align</p>
        <div className="grid grid-cols-3 gap-1">
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align left" onClick={() => align("left")}><AlignLeft size={14} /></button>
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align horizontal center" onClick={() => align("center")}><AlignCenterHorizontal size={14} /></button>
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align right" onClick={() => align("right")}><AlignRight size={14} /></button>
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align top" onClick={() => align("top")}><AlignStartVertical size={14} /></button>
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align vertical center" onClick={() => align("middle")}><AlignCenterVertical size={14} /></button>
          <button className="rounded border bg-white p-2 hover:bg-slate-100" title="Align bottom" onClick={() => align("bottom")}><AlignEndVertical size={14} /></button>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600">Dimensions</p>
          <button
            className={`rounded border p-1.5 ${lockAspect ? "bg-slate-200" : "bg-white"}`}
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
            className="w-full rounded border bg-white p-2"
            onChange={(e) => updateSize("width", Number(e.target.value))}
          />
          <input
            type="number"
            min={1}
            value={snapshot.height}
            className="w-full rounded border bg-white p-2"
            onChange={(e) => updateSize("height", Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Opacity ({Math.round(snapshot.opacity * 100)}%)</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={snapshot.opacity}
          className="w-full"
          onChange={(e) => mutate((obj) => obj.set("opacity", Number(e.target.value)))}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Fill</label>
          <input
            type="color"
            value={snapshot.fill}
            className="h-10 w-full cursor-pointer rounded border bg-white p-1"
            onChange={(e) => mutate((obj) => obj.set("fill", e.target.value))}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Stroke</label>
          <input
            type="color"
            value={snapshot.stroke}
            className="h-10 w-full cursor-pointer rounded border bg-white p-1"
            onChange={(e) => mutate((obj) => obj.set("stroke", e.target.value))}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Stroke width</label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={snapshot.strokeWidth}
          className="w-full rounded border bg-white p-2"
          onChange={(e) => mutate((obj) => obj.set({ strokeWidth: Math.max(0, Number(e.target.value)), strokeUniform: true }))}
        />
      </div>
    </div>
  );
}
