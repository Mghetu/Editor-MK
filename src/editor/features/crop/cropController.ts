import { Rect } from "fabric";
import type { Canvas } from "fabric";
import { makeCircleClip } from "./circleMask";
import { clampImageToFrame, fitFrameInsideCanvas, getFrameBounds } from "./cropMath";
import { createCropOverlay, type CropOverlay } from "./cropOverlay";

export type CropMode = "rect" | "circle";

type CropSession = {
  overlay: CropOverlay;
  image: any;
  original: { left: number; top: number; scaleX: number; scaleY: number; clipPath: any };
  unbind: () => void;
};

export const startCrop = (canvas: Canvas, image: any): CropSession | null => {
  if (!canvas || !image) return null;

  const overlay = createCropOverlay(
    canvas,
    image.left ?? 0,
    image.top ?? 0,
    image.getScaledWidth?.() ?? 200,
    image.getScaledHeight?.() ?? 200
  );

  const original = {
    left: image.left ?? 0,
    top: image.top ?? 0,
    scaleX: image.scaleX ?? 1,
    scaleY: image.scaleY ?? 1,
    clipPath: image.clipPath
  };

  image.set({ selectable: true, evented: true });
  canvas.setActiveObject(overlay.frame);

  const onFrameUpdate = () => {
    fitFrameInsideCanvas(overlay.frame, canvas);
    clampImageToFrame(image, overlay.frame);
    overlay.refresh();
  };

  const onImageUpdate = () => {
    clampImageToFrame(image, overlay.frame);
    overlay.refresh();
  };

  const movingHandler = ({ target }: any) => {
    if (target === overlay.frame) onFrameUpdate();
    if (target === image) onImageUpdate();
  };

  const scalingHandler = ({ target }: any) => {
    if (target === overlay.frame) onFrameUpdate();
    if (target === image) onImageUpdate();
  };

  canvas.on("object:moving", movingHandler);
  canvas.on("object:scaling", scalingHandler);

  const unbind = () => {
    canvas.off("object:moving", movingHandler);
    canvas.off("object:scaling", scalingHandler);
  };

  return { overlay, image, original, unbind };
};

export const resizeCropFrame = (session: CropSession, canvas: Canvas, w: number, h: number) => {
  const frame = session.overlay.frame;
  frame.set({ width: Math.max(20, w), height: Math.max(20, h), scaleX: 1, scaleY: 1 });
  fitFrameInsideCanvas(frame, canvas);
  clampImageToFrame(session.image, frame);
  session.overlay.refresh();
};

export const applyCrop = (session: CropSession, mode: CropMode) => {
  const { image, overlay } = session;
  const { left, top, width, height } = getFrameBounds(overlay.frame);

  image.clipPath =
    mode === "circle"
      ? makeCircleClip(left, top, width, height)
      : new Rect({ left, top, width, height, absolutePositioned: true });

  image.set("crop", {
    mode,
    frameW: width,
    frameH: height,
    frameLeft: left,
    frameTop: top,
    imgLeft: image.left,
    imgTop: image.top,
    imgScaleX: image.scaleX,
    imgScaleY: image.scaleY
  });
};

export const cancelCrop = (session: CropSession) => {
  const { image, original } = session;
  image.left = original.left;
  image.top = original.top;
  image.scaleX = original.scaleX;
  image.scaleY = original.scaleY;
  image.clipPath = original.clipPath;
};

export const closeCropSession = (canvas: Canvas, session: CropSession) => {
  session.unbind();
  session.overlay.destroy();
  canvas.setActiveObject(session.image);
  canvas.renderAll();
};
