import type { Canvas } from "fabric";

export const bindSelectionEvents = (
  canvas: Canvas,
  onSelectionChange: (id?: string, type?: "text" | "image" | "table") => void
) => {
  const update = () => {
    const obj = canvas.getActiveObject() as any;
    const type = obj?.data?.type;

    // Keep current inspector context when crop helpers are selected.
    if (type === "crop-frame") return;

    onSelectionChange(obj?.data?.id, type);
  };

  canvas.on("selection:created", update);
  canvas.on("selection:updated", update);
  canvas.on("selection:cleared", () => onSelectionChange(undefined, undefined));
};
