import type { Canvas } from "fabric";

export const bindSelectionEvents = (
  canvas: Canvas,
  onSelectionChange: (id?: string, type?: "text" | "image" | "table") => void
) => {
  const update = () => {
    const obj = canvas.getActiveObject() as any;
    onSelectionChange(obj?.data?.id, obj?.data?.type);
  };
  canvas.on("selection:created", update);
  canvas.on("selection:updated", update);
  canvas.on("selection:cleared", () => onSelectionChange(undefined, undefined));
};
