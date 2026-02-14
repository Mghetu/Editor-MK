import { Rect } from "fabric";
import type { Canvas } from "fabric";
import { makeCircleClip } from "./circleMask";
import { createCropFrame } from "./cropOverlay";

export type CropMode = "rect" | "circle";

export const startCrop = (canvas: Canvas, image: any) => {
  const frame = createCropFrame(canvas, image.left ?? 0, image.top ?? 0, image.getScaledWidth(), image.getScaledHeight());
  return { frame, original: { left: image.left, top: image.top, scaleX: image.scaleX, scaleY: image.scaleY, clipPath: image.clipPath } };
};

export const applyCrop = (image: any, frame: any, mode: CropMode) => {
  const left = frame.left ?? 0;
  const top = frame.top ?? 0;
  const w = (frame.width ?? 1) * (frame.scaleX ?? 1);
  const h = (frame.height ?? 1) * (frame.scaleY ?? 1);
  image.clipPath = mode === "circle" ? makeCircleClip(left, top, w, h) : new Rect({ left, top, width: w, height: h, absolutePositioned: true });
  image.set("crop", { mode, frameW: w, frameH: h, frameLeft: left, frameTop: top, imgLeft: image.left, imgTop: image.top, imgScaleX: image.scaleX, imgScaleY: image.scaleY });
};

export const cancelCrop = (canvas: Canvas, image: any, state: any, frame: any) => {
  image.left = state.original.left;
  image.top = state.original.top;
  image.scaleX = state.original.scaleX;
  image.scaleY = state.original.scaleY;
  image.clipPath = state.original.clipPath;
  canvas.remove(frame);
};
