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

export type CropLiveInfo = {
  cropW: number;
  cropH: number;
  cropX: number;
  cropY: number;
  frameW: number;
  frameH: number;
  imageLeft: number;
  imageTop: number;
  sourceW: number;
  sourceH: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const getViewportCenter = (canvas: Canvas) => {
  if (typeof (canvas as any).getCenterPoint === "function") {
    const pt = (canvas as any).getCenterPoint();
    return { x: Number(pt?.x ?? canvas.getWidth() / 2), y: Number(pt?.y ?? canvas.getHeight() / 2) };
  }
  return { x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 };
};

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

const resizeFrameAroundCenter = (frame: any, width: number, height: number) => {
  const center = frame.getCenterPoint?.() ?? {
    x: (frame.left ?? 0) + ((frame.width ?? 1) * (frame.scaleX ?? 1)) / 2,
    y: (frame.top ?? 0) + ((frame.height ?? 1) * (frame.scaleY ?? 1)) / 2
  };

  frame.set({
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    left: Number(center.x) - width / 2,
    top: Number(center.y) - height / 2
  });
};

const updateLive = (session: CropSession, onChange?: (info: CropLiveInfo) => void) => {
  if (!onChange) return;
  const b = getFrameBounds(session.overlay.frame);
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);

  const cropX = clamp((b.left - (session.image.left ?? 0)) / sx, 0, session.source.width);
  const cropY = clamp((b.top - (session.image.top ?? 0)) / sy, 0, session.source.height);

  onChange({
    cropW: b.width / sx,
    cropH: b.height / sy,
    cropX,
    cropY,
    frameW: b.width,
    frameH: b.height,
    imageLeft: Number(session.image.left ?? 0),
    imageTop: Number(session.image.top ?? 0),
    sourceW: session.source.width,
    sourceH: session.source.height
  });
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

  const imgW = image.getScaledWidth?.() ?? 200;
  const imgH = image.getScaledHeight?.() ?? 200;
  const canvasW = Math.max(1, canvas.getWidth());
  const canvasH = Math.max(1, canvas.getHeight());
  const viewportCenter = getViewportCenter(canvas);
  const centerX = viewportCenter.x;
  const centerY = viewportCenter.y;

  const maxFrameW = Math.max(20, canvasW - 24);
  const maxFrameH = Math.max(20, canvasH - 24);
  const frameW = Math.max(20, Math.min(imgW, maxFrameW));
  const frameH = Math.max(20, Math.min(imgH, maxFrameH));
  const frameLeft = clamp(centerX - frameW / 2, 0, Math.max(0, canvasW - frameW));
  const frameTop = clamp(centerY - frameH / 2, 0, Math.max(0, canvasH - frameH));

  image.set({
    left: centerX - imgW / 2,
    top: centerY - imgH / 2,
    selectable: true,
    evented: true,
    hasControls: true,
    lockMovementX: false,
    lockMovementY: false,
    lockScalingX: false,
    lockScalingY: false,
    lockRotation: true
  });

  const overlay = createCropOverlay(canvas, frameLeft, frameTop, frameW, frameH);

  overlay.frame.set({
    hasControls: false,
    selectable: false,
    evented: false,
    lockRotation: true,
    lockMovementX: true,
    lockMovementY: true
  });

  const movingHandler = ({ target }: any) => {
    if (target === image) updateFromFrame(cropSession, onChange);
  };

  const scalingHandler = ({ target }: any) => {
    if (target === image) {
      updateFromFrame(cropSession, onChange);
    }
  };

  const cropSession: CropSession = {
    overlay,
    image,
    snapshot,
    source: getSourceSize(image),
    unbind: () => undefined
  };

  canvas.on("object:moving", movingHandler);
  canvas.on("object:scaling", scalingHandler);

  cropSession.unbind = () => {
    canvas.off("object:moving", movingHandler);
    canvas.off("object:scaling", scalingHandler);
  };

  updateFromFrame(cropSession, onChange);
  canvas.setActiveObject(image);
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

  resizeFrameAroundCenter(frame, size.w, size.h);
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

  resizeFrameAroundCenter(session.overlay.frame, Math.min(w, imgW), Math.min(h, imgH));
  session.overlay.frame.setCoords();
  updateFromFrame(session, onChange);
  canvas.requestRenderAll();
};

export const setCropOriginPx = (
  session: CropSession,
  canvas: Canvas,
  xPx: number,
  yPx: number,
  onChange?: (info: CropLiveInfo) => void
) => {
  const frame = getFrameBounds(session.overlay.frame);
  const sx = Math.abs(session.image.scaleX ?? 1);
  const sy = Math.abs(session.image.scaleY ?? 1);
  const maxX = Math.max(0, session.source.width - frame.width / sx);
  const maxY = Math.max(0, session.source.height - frame.height / sy);
  const x = clamp(xPx, 0, maxX);
  const y = clamp(yPx, 0, maxY);

  session.image.set({
    left: frame.left - x * sx,
    top: frame.top - y * sy
  });
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
