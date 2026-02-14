import { Canvas } from "fabric";
import { applyGlobalHandleStyle, applyObjectHandleStyle } from "./handleStyle";

export const createCanvas = (el: HTMLCanvasElement, width: number, height: number, background: string) => {
  applyGlobalHandleStyle();

  const canvas = new Canvas(el, {
    preserveObjectStacking: true,
    controlsAboveOverlay: true,
    selection: true,
    backgroundColor: background,
    width,
    height
  });

  canvas.on("object:added", ({ target }) => {
    if (!target) return;
    applyObjectHandleStyle(target as any);
    target.setCoords();
    canvas.requestRenderAll();
  });

  return canvas;
};
