import type { Canvas } from "fabric";

export const bindSelectionEvents = (
  canvas: Canvas,
  onSelectionChange: (id?: string, type?: "text" | "image" | "table" | "shape") => void
) => {
  let lastId: string | undefined;
  let lastType: "text" | "image" | "table" | "shape" | undefined;

  const emitIfChanged = (id?: string, type?: "text" | "image" | "table" | "shape") => {
    if (id === lastId && type === lastType) return;
    lastId = id;
    lastType = type;
    onSelectionChange(id, type);
  };

  const update = () => {
    const obj = canvas.getActiveObject() as any;
    const type = obj?.data?.type;

    // Keep current inspector context when crop helpers are selected.
    if (type === "crop-frame") return;

    emitIfChanged(obj?.data?.id, type);
  };

  const clear = () => {
    const hasActiveCropFrame = canvas.getObjects().some((obj: any) => obj?.data?.type === "crop-frame");
    if (hasActiveCropFrame) return;
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
