import { Rect } from "fabric";
import type { Canvas } from "fabric";

export const createCropFrame = (canvas: Canvas, left: number, top: number, width: number, height: number) => {
  const frame = new Rect({
    left,
    top,
    width,
    height,
    fill: "rgba(0,0,0,0)",
    stroke: "#0ea5e9",
    strokeWidth: 2,
    hasRotatingPoint: false,
    lockRotation: true
  }) as any;
  frame.set("data", { id: crypto.randomUUID(), type: "crop-frame", name: "Crop Frame" });
  canvas.add(frame);
  canvas.setActiveObject(frame);
  return frame;
};
