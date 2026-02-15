import { Rect } from "fabric";
import type { Canvas } from "fabric";
import { getFrameBounds } from "./cropMath";

export type CropOverlay = {
  frame: any;
  masks: Rect[];
  refresh: () => void;
  destroy: () => void;
};

export const createCropOverlay = (canvas: Canvas, left: number, top: number, width: number, height: number): CropOverlay => {
  const masks = [
    new Rect({ fill: "rgba(15,23,42,0.45)", selectable: false, evented: false }),
    new Rect({ fill: "rgba(15,23,42,0.45)", selectable: false, evented: false }),
    new Rect({ fill: "rgba(15,23,42,0.45)", selectable: false, evented: false }),
    new Rect({ fill: "rgba(15,23,42,0.45)", selectable: false, evented: false })
  ];

  const frame = new Rect({
    left,
    top,
    width,
    height,
    fill: "rgba(0,0,0,0)",
    stroke: "#0ea5e9",
    strokeWidth: 2,
    hasRotatingPoint: false,
    lockRotation: true,
    cornerColor: "#0ea5e9",
    transparentCorners: false
  }) as any;

  frame.set("data", { id: crypto.randomUUID(), type: "crop-frame", name: "Crop Frame" });

  const refresh = () => {
    const b = getFrameBounds(frame);
    const canvasW = canvas.getWidth();
    const canvasH = canvas.getHeight();
    masks[0].set({ left: 0, top: 0, width: canvasW, height: b.top });
    masks[1].set({ left: 0, top: b.top, width: b.left, height: b.height });
    masks[2].set({ left: b.left + b.width, top: b.top, width: Math.max(0, canvasW - (b.left + b.width)), height: b.height });
    masks[3].set({ left: 0, top: b.top + b.height, width: canvasW, height: Math.max(0, canvasH - (b.top + b.height)) });
    canvas.requestRenderAll();
  };

  masks.forEach((m) => canvas.add(m));
  canvas.add(frame);
  canvas.setActiveObject(frame);
  refresh();

  const destroy = () => {
    masks.forEach((m) => canvas.remove(m));
    canvas.remove(frame);
  };

  return { frame, masks, refresh, destroy };
};
