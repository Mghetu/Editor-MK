import type { Canvas } from "fabric";

type EditorSelectionType = "text" | "image" | "table" | "shape" | "imageGrid" | "autoLayout";


const unwrapSelectionTarget = (obj: any) => {
  const fabricType = String(obj?.type ?? "").toLowerCase();
  if (fabricType !== "activeselection") return obj;
  const items = Array.isArray(obj?._objects) ? obj._objects : [];
  if (items.length === 1) return items[0];
  return obj;
};

export const inferSelectionType = (obj: any): EditorSelectionType | undefined => {
  const target = unwrapSelectionTarget(obj);
  const explicitType = target?.data?.type;
  if (explicitType === "text" || explicitType === "image" || explicitType === "table" || explicitType === "shape" || explicitType === "imageGrid" || explicitType === "autoLayout") {
    return explicitType;
  }

  if (target?.table) return "table";


  if (Array.isArray(target?.data?.slots) && Number.isFinite(Number(target?.data?.frameWidth ?? NaN)) && Number.isFinite(Number(target?.data?.frameHeight ?? NaN))) {
    return "imageGrid";
  }

  const fabricType = String(target?.type ?? "").toLowerCase();
  if (fabricType === "textbox" || fabricType === "i-text" || fabricType === "text") return "text";
  if (fabricType === "image") return "image";

  // Rect/circle-like objects are edited with ShapeInspector in this editor.
  if (fabricType === "rect" || fabricType === "circle" || fabricType === "triangle" || fabricType === "polygon" || fabricType === "ellipse") {
    return "shape";
  }

  if (fabricType === "group") {
    if (Array.isArray(target?.data?.slots)) return "imageGrid";
    if (target?.table) return "table";
  }

  return undefined;
};

export const bindSelectionEvents = (
  canvas: Canvas,
  onSelectionChange: (id?: string, type?: EditorSelectionType) => void
) => {
  let lastId: string | undefined;
  let lastType: EditorSelectionType | undefined;
  let clearToken = 0;

  const emitIfChanged = (id?: string, type?: EditorSelectionType, force = false) => {
    if (!force && id === lastId && type === lastType) return;
    lastId = id;
    lastType = type;
    onSelectionChange(id, type);
  };

  const update = () => {
    clearToken += 1;
    const obj = canvas.getActiveObject() as any;
    const target = unwrapSelectionTarget(obj);
    if (target?.data?.isCropOverlay) return;

    const type = inferSelectionType(target);
    if (target && type && !target?.data?.type) {
      target.set?.("data", {
        ...(target?.data ?? {}),
        id: target?.data?.id ?? target?.id ?? crypto.randomUUID?.(),
        type
      });
    }

    const id = (target?.data?.id ?? target?.id) as string | undefined;

    emitIfChanged(id, type, true);
  };

  const clear = () => {
    const token = ++clearToken;
    const hasCropOverlay = canvas.getObjects().some((obj: any) => obj?.data?.isCropOverlay);
    if (hasCropOverlay) {
      // During crop mode we intentionally avoid clearing the inspector state,
      // but we still need to reset the event cache so selecting the same object
      // after undo/redo can emit again.
      lastId = undefined;
      lastType = undefined;
      return;
    }

    queueMicrotask(() => {
      if (token !== clearToken) return;
      const active = canvas.getActiveObject() as any;
      if (active && !active?.data?.isCropOverlay) {
        update();
        return;
      }
      emitIfChanged(undefined, undefined);
    });
  };

  canvas.on("selection:created", update);
  canvas.on("selection:updated", update);
  canvas.on("selection:cleared", clear);

  return () => {
    canvas.off("selection:created", update);
    canvas.off("selection:updated", update);
    canvas.off("selection:cleared", clear);
  };
};
