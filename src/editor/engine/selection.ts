import type { Canvas } from "fabric";

export const bindSelectionEvents = (
  canvas: Canvas,
  onSelectionChange: (id?: string, type?: "text" | "image" | "table" | "shape" | "imageGrid") => void
) => {
  let lastId: string | undefined;
  let lastType: "text" | "image" | "table" | "shape" | "imageGrid" | undefined;

  const emitIfChanged = (id?: string, type?: "text" | "image" | "table" | "shape" | "imageGrid") => {
    if (id === lastId && type === lastType) return;
    lastId = id;
    lastType = type;
    onSelectionChange(id, type);
  };

  const update = () => {
    const obj = canvas.getActiveObject() as any;
    if (obj?.data?.isCropOverlay) return;
    emitIfChanged(obj?.data?.id, obj?.data?.type);
  };

  const clear = () => {
    const hasCropOverlay = canvas.getObjects().some((obj: any) => obj?.data?.isCropOverlay);
    if (hasCropOverlay) return;
    emitIfChanged(undefined, undefined);
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
