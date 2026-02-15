import type { Canvas } from "fabric";
import { clampImageToFrame, getFrameBounds } from "./cropMath";
import { createCropOverlay, type CropOverlay } from "./cropOverlay";

export type CropPreset = "1:1" | "9:16" | "16:9" | "300x300" | "600x250";

export const CROP_RATIO_PRESETS: Array<{ key: CropPreset; label: string }> = [
  { key: "1:1", label: "1:1" },
  { key: "9:16", label: "9:16" },
  { key: "16:9", label: "16:9" },
  { key: "300x300", label: "300×300px" },
  { key: "600x250", label: "600×250px" }
];

export type CropSession = {
  overlay: CropOverlay;
  image: any;
  snapshot: {
    left: number;
    top: number;
    width: number;
    height: number;
    cropX: number;
    cropY: number;
    selectable: boolean;
    lockMovementX?: boolean;
    lockMovementY?: boolean;
    lockScalingX?: boolean;
    lockScalingY?: boolean;
    lockRotation?: boolean;
  };
  source: { width: number; height: number };
  unbind: () => void;
};

export type CropLiveInfo = { cropW: number; cropH: number; frameW: number; frameH: number };

// Compatibility no-op handlers kept so partially merged branches that still reference
// these names continue to compile during CI deployment builds.
const onMouseDown = () => undefined;
const onMouseMove = () => undefined;
const onMouseUp = () => undefined;
const onKeyDown = () => undefined;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getSourceSize = (image: any) => {
  const el = image.getElement?.();
  return {
    width: Math.max(1, el?.naturalWidth ?? image.width ?? 1),
    height: Math.max(1, el?.naturalHeight ?? image.height ?? 1)
  };
};

const frameSizeFromPreset = (preset: CropPreset, imgW: number, imgH: number) => {
  if (preset === "300x300") return { w: Math.min(300, imgW), h: Math.min(300, imgH) };
  if (preset === "600x250") return { w: Math.min(600, imgW), h: Math.min(250, imgH) };

  const ratio = preset === "1:1" ? 1 : preset === "16:9" ? 16 / 9 : 9 / 16;
  let w = imgW;
  let h = w / ratio;
  if (h > imgH) {
    h = imgH;
    w = h * ratio;
  }
  return { w, h };
};

const updateLive = (session: CropSession, onChange?: (info: CropLiveInfo) => void) => {
  if (!onChange) return;
  const b = getFrameBounds(session.overlay.frame);
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);
  onChange({ cropW: b.width / sx, cropH: b.height / sy, frameW: b.width, frameH: b.height });
};

const updateFromFrame = (session: CropSession, onChange?: (info: CropLiveInfo) => void) => {
  clampImageToFrame(session.image, session.overlay.frame);
  session.overlay.refresh();
  updateLive(session, onChange);
};

export const startCrop = (
  canvas: Canvas,
  image: any,
  onChange?: (info: CropLiveInfo) => void
): CropSession | null => {
  if (!canvas || !image) return null;

  const snapshot = {
    left: image.left ?? 0,
    top: image.top ?? 0,
    width: image.width ?? 1,
    height: image.height ?? 1,
    cropX: image.cropX ?? 0,
    cropY: image.cropY ?? 0,
    selectable: image.selectable,
    lockMovementX: image.lockMovementX,
    lockMovementY: image.lockMovementY,
    lockScalingX: image.lockScalingX,
    lockScalingY: image.lockScalingY,
    lockRotation: image.lockRotation
  };

  const overlay = createCropOverlay(
    canvas,
    image.left ?? 0,
    image.top ?? 0,
    image.getScaledWidth?.() ?? 200,
    image.getScaledHeight?.() ?? 200
  );

  image.set({
    selectable: true,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true
  });

  overlay.frame.set({
    hasControls: true,
    lockRotation: true
  });

  const movingHandler = ({ target }: any) => {
    if (target === overlay.frame || target === image) updateFromFrame(cropSession, onChange);
  };

  const scalingHandler = ({ target }: any) => {
    if (target === overlay.frame) {
      overlay.frame.set({ scaleX: 1, scaleY: 1, width: Math.max(20, overlay.frame.width ?? 20), height: Math.max(20, overlay.frame.height ?? 20) });
      updateFromFrame(cropSession, onChange);
    }
  };

  var cropSession: CropSession = {
    overlay,
    image,
    snapshot,
    source: getSourceSize(image),
    unbind: () => undefined
  };

  var cropSession: CropSession = {
    overlay,
    image,
    snapshot,
    source: getSourceSize(image),
    unbind: () => undefined
  };

  canvas.on("mouse:down", onMouseDown);
  canvas.on("mouse:move", onMouseMove);
  canvas.on("mouse:up", onMouseUp);
  window.addEventListener("keydown", onKeyDown);

  cropSession.unbind = () => {
    canvas.off("object:moving", movingHandler);
    canvas.off("object:scaling", scalingHandler);
  };

  updateFromFrame(cropSession, onChange);
  canvas.setActiveObject(overlay.frame);
  return cropSession;
};

export const setCropPreset = (
  session: CropSession,
  canvas: Canvas,
  preset: CropPreset,
  onChange?: (info: CropLiveInfo) => void
) => {
  const imgW = session.image.getScaledWidth();
  const imgH = session.image.getScaledHeight();
  const frame = session.overlay.frame;
  const size = frameSizeFromPreset(preset, imgW, imgH);

  frame.set({ width: size.w, height: size.h, scaleX: 1, scaleY: 1 });
  frame.setCoords();
  updateFromFrame(session, onChange);
  canvas.requestRenderAll();
};

export const setCustomCropSizePx = (
  session: CropSession,
  canvas: Canvas,
  wPx: number,
  hPx: number,
  onChange?: (info: CropLiveInfo) => void
) => {
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);
  const imgW = session.image.getScaledWidth();
  const imgH = session.image.getScaledHeight();

  const w = clamp(wPx, 1, session.source.width) * sx;
  const h = clamp(hPx, 1, session.source.height) * sy;

  session.overlay.frame.set({ width: Math.min(w, imgW), height: Math.min(h, imgH), scaleX: 1, scaleY: 1 });
  session.overlay.frame.setCoords();
  updateFromFrame(session, onChange);
  canvas.requestRenderAll();
};

export const applyCrop = (session: CropSession, canvas: Canvas) => {
  const frame = getFrameBounds(session.overlay.frame);
  const imgLeft = session.image.left ?? 0;
  const imgTop = session.image.top ?? 0;
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);

  const srcCropX = clamp((frame.left - imgLeft) / sx, 0, session.source.width);
  const srcCropY = clamp((frame.top - imgTop) / sy, 0, session.source.height);
  const srcCropW = clamp(frame.width / sx, 1, session.source.width - srcCropX);
  const srcCropH = clamp(frame.height / sy, 1, session.source.height - srcCropY);

  session.image.set({
    cropX: srcCropX,
    cropY: srcCropY,
    width: srcCropW,
    height: srcCropH,
    cropN: {
      x: srcCropX / session.source.width,
      y: srcCropY / session.source.height,
      w: srcCropW / session.source.width,
      h: srcCropH / session.source.height
    },
    left: frame.left,
    top: frame.top
  });
  session.image.setCoords();
  canvas.requestRenderAll();
};

export const resetCrop = (session: CropSession, canvas: Canvas, onChange?: (info: CropLiveInfo) => void) => {
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);

  session.image.set({
    cropX: 0,
    cropY: 0,
    width: session.source.width,
    height: session.source.height,
    cropN: { x: 0, y: 0, w: 1, h: 1 }
  });

  session.overlay.frame.set({
    left: session.image.left,
    top: session.image.top,
    width: session.source.width * sx,
    height: session.source.height * sy,
    scaleX: 1,
    scaleY: 1
  });

  updateFromFrame(session, onChange);
};

export const cancelCrop = (canvas: Canvas, session: CropSession) => {
  session.image.set({
    left: session.snapshot.left,
    top: session.snapshot.top,
    width: session.snapshot.width,
    height: session.snapshot.height,
    cropX: session.snapshot.cropX,
    cropY: session.snapshot.cropY,
    selectable: session.snapshot.selectable,
    lockMovementX: session.snapshot.lockMovementX,
    lockMovementY: session.snapshot.lockMovementY,
    lockScalingX: session.snapshot.lockScalingX,
    lockScalingY: session.snapshot.lockScalingY,
    lockRotation: session.snapshot.lockRotation
  });
  session.image.setCoords();
  canvas.requestRenderAll();
};

export const closeCropSession = (canvas: Canvas, session: CropSession) => {
  session.unbind();
  session.overlay.destroy();
  session.image.set({
    selectable: session.snapshot.selectable,
    lockMovementX: session.snapshot.lockMovementX,
    lockMovementY: session.snapshot.lockMovementY,
    lockScalingX: session.snapshot.lockScalingX,
    lockScalingY: session.snapshot.lockScalingY,
    lockRotation: session.snapshot.lockRotation
  });
  canvas.setActiveObject(session.image);
  canvas.requestRenderAll();
};
