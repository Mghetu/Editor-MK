import { Canvas, FabricImage } from "fabric";
import { applyGlobalHandleStyle, applyObjectHandleStyle } from "./handleStyle";

const customImageProps = new Set([...(FabricImage.customProperties ?? []), "cropN"]);
FabricImage.customProperties = Array.from(customImageProps);

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
