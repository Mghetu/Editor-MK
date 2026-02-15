import { FabricImage, Rect, type Canvas, type Point } from "fabric";

export type NormalizedCrop = { x: number; y: number; w: number; h: number };

export type CropRatioPreset = { id: string; label: string; ratio: number | null };

export const CROP_RATIO_PRESETS: CropRatioPreset[] = [
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
  { id: "free", label: "Free", ratio: null }
];

type Snapshot = {
  left: number;
  top: number;
  scaleX: number;
  scaleY: number;
  angle: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropN?: NormalizedCrop;
  flipX: boolean;
  flipY: boolean;
  lockMovementX?: boolean;
  lockMovementY?: boolean;
  lockScalingX?: boolean;
  lockScalingY?: boolean;
  lockRotation?: boolean;
  selectable?: boolean;
};

type DragState =
  | { kind: "pan"; lastCanvasPoint: { x: number; y: number } }
  | { kind: "resize"; corner: string; anchorLocal: { x: number; y: number } };

export type CropLiveInfo = {
  cropW: number;
  cropH: number;
  frameW: number;
  frameH: number;
};

export type CropSession = {
  image: any;
  previewImage: any;
  frame: Rect;
  snapshot: Snapshot;
  source: { width: number; height: number };
  baseCrop: { x: number; y: number; w: number; h: number };
  ratio: number | null;
  imgCx: number;
  imgCy: number;
  drag?: DragState;
  onChange?: (info: CropLiveInfo) => void;
  unbind: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const rotate = (point: { x: number; y: number }, angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: point.x * c - point.y * s, y: point.x * s + point.y * c };
};

const frameSize = (frame: Rect) => ({
  w: Math.max(1, (frame.width ?? 1) * (frame.scaleX ?? 1)),
  h: Math.max(1, (frame.height ?? 1) * (frame.scaleY ?? 1))
});

const getSourceSize = (image: any) => {
  const cropN = image.cropN as NormalizedCrop | undefined;
  const fromCropN = cropN && cropN.w > 0 && cropN.h > 0 ? { w: (image.width ?? 1) / cropN.w, h: (image.height ?? 1) / cropN.h } : null;
  const natural = image.getElement?.();
  const fromNatural = natural?.naturalWidth && natural?.naturalHeight ? { w: natural.naturalWidth, h: natural.naturalHeight } : null;
  return {
    width: Math.max(1, Math.round(fromCropN?.w ?? fromNatural?.w ?? image.width ?? 1)),
    height: Math.max(1, Math.round(fromCropN?.h ?? fromNatural?.h ?? image.height ?? 1))
  };
};

const toFrameLocal = (frame: Rect, canvasPoint: { x: number; y: number }) => {
  const cx = frame.left ?? 0;
  const cy = frame.top ?? 0;
  const relative = { x: canvasPoint.x - cx, y: canvasPoint.y - cy };
  return rotate(relative, -(frame.angle ?? 0));
};

const cornerLocal = (frame: Rect, corner: string) => {
  const { w, h } = frameSize(frame);
  const halfW = w / 2;
  const halfH = h / 2;
  if (corner === "tl") return { x: -halfW, y: -halfH };
  if (corner === "tr") return { x: halfW, y: -halfH };
  if (corner === "bl") return { x: -halfW, y: halfH };
  return { x: halfW, y: halfH };
};

const oppositeCorner = (corner: string) => {
  if (corner === "tl") return "br";
  if (corner === "tr") return "bl";
  if (corner === "bl") return "tr";
  return "tl";
};

const frameCenterFromLocal = (frame: Rect, local: { x: number; y: number }) => {
  const deltaCanvas = rotate(local, frame.angle ?? 0);
  return { x: (frame.left ?? 0) + deltaCanvas.x, y: (frame.top ?? 0) + deltaCanvas.y };
};

const clampOffsets = (session: CropSession) => {
  const { w: fw, h: fh } = frameSize(session.frame);
  const A = session.image.getScaledWidth();
  const B = session.image.getScaledHeight();
  const maxOffsetX = Math.max(0, A / 2 - fw / 2);
  const maxOffsetY = Math.max(0, B / 2 - fh / 2);
  session.imgCx = clamp(session.imgCx, -maxOffsetX, maxOffsetX);
  session.imgCy = clamp(session.imgCy, -maxOffsetY, maxOffsetY);
};

const syncImageVisual = (session: CropSession) => {
  clampOffsets(session);
  const delta = rotate({ x: session.imgCx, y: session.imgCy }, session.frame.angle ?? 0);
  session.previewImage.set({
    left: (session.frame.left ?? 0) + delta.x,
    top: (session.frame.top ?? 0) + delta.y,
    angle: session.frame.angle ?? 0
  });
  session.previewImage.setCoords();
};

const syncPreviewCrop = (session: CropSession) => {
  session.previewImage.set({
    cropX: session.image.cropX,
    cropY: session.image.cropY,
    width: session.image.width,
    height: session.image.height,
    scaleX: session.image.scaleX,
    scaleY: session.image.scaleY,
    flipX: session.image.flipX,
    flipY: session.image.flipY,
    opacity: session.image.opacity
  });
  session.previewImage.setCoords();
};

const computeLiveInfo = (session: CropSession): CropLiveInfo => {
  const sX = Math.abs(session.image.scaleX ?? 1);
  const sY = Math.abs(session.image.scaleY ?? 1);
  const { w: frameW, h: frameH } = frameSize(session.frame);
  return {
    cropW: frameW / sX,
    cropH: frameH / sY,
    frameW,
    frameH
  };
};

const emitLive = (session: CropSession, canvas: Canvas) => {
  session.onChange?.(computeLiveInfo(session));
  canvas.requestRenderAll();
};

const clampFrameToImage = (session: CropSession, nextW: number, nextH: number) => {
  const A = session.image.getScaledWidth();
  const B = session.image.getScaledHeight();
  let w = Math.max(20, nextW);
  let h = Math.max(20, nextH);
  if (session.ratio) {
    const fit = Math.min(A / w, B / h, 1);
    w *= fit;
    h *= fit;
  }
  w = Math.min(w, A);
  h = Math.min(h, B);
  return { w, h };
};

const bindOverlay = (canvas: Canvas, frame: Rect) => {
  const drawOverlay = () => {
    const ctx = canvas.getContext();
    if (!ctx) return;
    const zoom = canvas.getZoom();
    const vt = canvas.viewportTransform;
    ctx.save();
    if (vt) ctx.transform(vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]);

    const width = canvas.getWidth() / zoom;
    const height = canvas.getHeight() / zoom;
    const { w, h } = frameSize(frame);
    const cx = frame.left ?? 0;
    const cy = frame.top ?? 0;
    const halfW = w / 2;
    const halfH = h / 2;

    const corners = [
      rotate({ x: -halfW, y: -halfH }, frame.angle ?? 0),
      rotate({ x: halfW, y: -halfH }, frame.angle ?? 0),
      rotate({ x: halfW, y: halfH }, frame.angle ?? 0),
      rotate({ x: -halfW, y: halfH }, frame.angle ?? 0)
    ].map((p) => ({ x: p.x + cx, y: p.y + cy }));

    ctx.beginPath();
    ctx.rect(-vt![4] / vt![0], -vt![5] / vt![3], width, height);
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = "rgba(15,23,42,0.45)";
    ctx.fill("evenodd");
    ctx.restore();
  };
  canvas.on("after:render", drawOverlay);
  return () => canvas.off("after:render", drawOverlay);
};

export const startCrop = (canvas: Canvas, image: any, onChange?: (info: CropLiveInfo) => void): CropSession | null => {
  if (!canvas || !image) return null;
  const snapshot: Snapshot = {
    left: image.left ?? 0,
    top: image.top ?? 0,
    scaleX: image.scaleX ?? 1,
    scaleY: image.scaleY ?? 1,
    angle: image.angle ?? 0,
    width: image.width ?? 1,
    height: image.height ?? 1,
    cropX: image.cropX ?? 0,
    cropY: image.cropY ?? 0,
    cropN: image.cropN,
    flipX: !!image.flipX,
    flipY: !!image.flipY,
    lockMovementX: image.lockMovementX,
    lockMovementY: image.lockMovementY,
    lockScalingX: image.lockScalingX,
    lockScalingY: image.lockScalingY,
    lockRotation: image.lockRotation,
    selectable: image.selectable
  };

  const frame = new Rect({
    left: image.left ?? 0,
    top: image.top ?? 0,
    width: image.getScaledWidth(),
    height: image.getScaledHeight(),
    originX: "center",
    originY: "center",
    angle: image.angle ?? 0,
    fill: "rgba(0,0,0,0)",
    stroke: "#0ea5e9",
    strokeWidth: 2,
    hasRotatingPoint: false,
    lockRotation: true,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    transparentCorners: false,
    cornerColor: "#0ea5e9",
    excludeFromExport: true
  });
  frame.set("data", { id: image.data?.id ?? crypto.randomUUID(), type: "crop-frame", name: "Crop Frame" });

  const previewImage = new FabricImage(image.getElement(), {
    originX: image.originX,
    originY: image.originY,
    left: image.left,
    top: image.top,
    scaleX: image.scaleX,
    scaleY: image.scaleY,
    angle: image.angle,
    width: image.width,
    height: image.height,
    cropX: image.cropX,
    cropY: image.cropY,
    flipX: image.flipX,
    flipY: image.flipY,
    opacity: image.opacity,
    selectable: false,
    evented: false,
    excludeFromExport: true
  });

  image.set({
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    selectable: false,
    visible: false,
    evented: true
  });

  canvas.add(previewImage);
  canvas.add(frame);
  canvas.bringObjectToFront(frame);
  canvas.setActiveObject(frame);

  const source = getSourceSize(image);
  const session: CropSession = {
    image,
    previewImage,
    frame,
    snapshot,
    source,
    baseCrop: {
      x: image.cropX ?? 0,
      y: image.cropY ?? 0,
      w: image.width ?? source.width,
      h: image.height ?? source.height
    },
    ratio: 1,
    imgCx: 0,
    imgCy: 0,
    onChange,
    unbind: () => undefined
  };

  const unbindOverlay = bindOverlay(canvas, frame);
  syncPreviewCrop(session);
  syncImageVisual(session);

  const onMouseDown = (opt: any) => {
    const pointer = canvas.getScenePoint(opt.e) as Point;
    const corner = (frame as any).__corner as string | undefined;
    if (opt.target === frame && corner && ["tl", "tr", "bl", "br"].includes(corner)) {
      session.drag = { kind: "resize", corner, anchorLocal: cornerLocal(frame, oppositeCorner(corner)) };
      return;
    }
    if (opt.target === previewImage || (opt.target === frame && !corner)) {
      session.drag = { kind: "pan", lastCanvasPoint: { x: pointer.x, y: pointer.y } };
    }
  };

  const onMouseMove = (opt: any) => {
    if (!session.drag) return;
    const pointer = canvas.getScenePoint(opt.e) as Point;
    if (session.drag.kind === "pan") {
      const dx = pointer.x - session.drag.lastCanvasPoint.x;
      const dy = pointer.y - session.drag.lastCanvasPoint.y;
      const local = rotate({ x: dx, y: dy }, -(frame.angle ?? 0));
      session.imgCx += local.x;
      session.imgCy += local.y;
      session.drag.lastCanvasPoint = { x: pointer.x, y: pointer.y };
      syncImageVisual(session);
      emitLive(session, canvas);
      return;
    }

    const anchor = session.drag.anchorLocal;
    const p = toFrameLocal(frame, { x: pointer.x, y: pointer.y });
    let dx = p.x - anchor.x;
    let dy = p.y - anchor.y;
    let w = Math.max(20, Math.abs(dx));
    let h = Math.max(20, Math.abs(dy));

    if (session.ratio) {
      const sx = dx === 0 ? 1 : Math.sign(dx);
      const sy = dy === 0 ? 1 : Math.sign(dy);
      if (Math.abs(dx) >= Math.abs(dy)) {
        h = w / session.ratio;
        dy = sy * h;
      } else {
        w = h * session.ratio;
        dx = sx * w;
      }
    }

    const clamped = clampFrameToImage(session, w, h);
    w = clamped.w;
    h = clamped.h;
    const sx = dx === 0 ? 1 : Math.sign(dx);
    const sy = dy === 0 ? 1 : Math.sign(dy);
    const constrainedP = { x: anchor.x + sx * w, y: anchor.y + sy * h };
    const centerLocal = { x: (anchor.x + constrainedP.x) / 2, y: (anchor.y + constrainedP.y) / 2 };
    const centerCanvas = frameCenterFromLocal(frame, centerLocal);

    frame.set({ left: centerCanvas.x, top: centerCanvas.y, width: w, height: h, scaleX: 1, scaleY: 1 });
    frame.setCoords();
    syncImageVisual(session);
    canvas.bringObjectToFront(frame);
    emitLive(session, canvas);
  };

  const onMouseUp = () => {
    session.drag = undefined;
  };

  canvas.on("mouse:down", onMouseDown);
  canvas.on("mouse:move", onMouseMove);
  canvas.on("mouse:up", onMouseUp);

  session.unbind = () => {
    canvas.off("mouse:down", onMouseDown);
    canvas.off("mouse:move", onMouseMove);
    canvas.off("mouse:up", onMouseUp);
    unbindOverlay();
  };

  emitLive(session, canvas);
  return session;
};

export const setCropRatio = (session: CropSession, ratio: number | null, canvas: Canvas) => {
  session.ratio = ratio;
  if (!ratio) {
    emitLive(session, canvas);
    return;
  }
  const A = session.image.getScaledWidth();
  const B = session.image.getScaledHeight();
  let w = A;
  let h = w / ratio;
  if (h > B) {
    h = B;
    w = h * ratio;
  }
  session.frame.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
  session.frame.setCoords();
  syncImageVisual(session);
  emitLive(session, canvas);
};

export const setCropSizeFromSourcePixels = (session: CropSession, canvas: Canvas, cropWpx: number, cropHpx: number) => {
  const srcW = clamp(cropWpx, 1, session.source.width);
  const srcH = clamp(cropHpx, 1, session.source.height);
  const sX = Math.abs(session.image.scaleX ?? 1);
  const sY = Math.abs(session.image.scaleY ?? 1);

  let w = srcW * sX;
  let h = srcH * sY;

  if (session.ratio) {
    const targetH = w / session.ratio;
    h = targetH;
  }

  const clamped = clampFrameToImage(session, w, h);
  session.frame.set({ width: clamped.w, height: clamped.h, scaleX: 1, scaleY: 1 });
  session.frame.setCoords();
  syncImageVisual(session);
  emitLive(session, canvas);
};

export const applyCrop = (session: CropSession, canvas: Canvas) => {
  const sX = Math.abs(session.image.scaleX ?? 1);
  const sY = Math.abs(session.image.scaleY ?? 1);
  const A = session.image.getScaledWidth();
  const B = session.image.getScaledHeight();
  const { w: Fw, h: Fh } = frameSize(session.frame);

  const srcCropW = Fw / sX;
  const srcCropH = Fh / sY;

  const dx = (A - Fw) / 2 - session.imgCx;
  const dy = (B - Fh) / 2 - session.imgCy;

  const localX = dx / sX;
  const localY = dy / sY;

  const minX = session.baseCrop.x;
  const minY = session.baseCrop.y;
  const maxX = session.baseCrop.x + session.baseCrop.w - srcCropW;
  const maxY = session.baseCrop.y + session.baseCrop.h - srcCropH;

  const srcCropX = clamp(minX + localX, minX, Math.max(minX, maxX));
  const srcCropY = clamp(minY + localY, minY, Math.max(minY, maxY));

  const cropN: NormalizedCrop = {
    x: srcCropX / session.source.width,
    y: srcCropY / session.source.height,
    w: srcCropW / session.source.width,
    h: srcCropH / session.source.height
  };

  session.image.set({
    cropX: srcCropX,
    cropY: srcCropY,
    width: srcCropW,
    height: srcCropH,
    cropN,
    left: session.frame.left,
    top: session.frame.top,
    angle: session.frame.angle,
    visible: true
  });
  session.image.setCoords();
  canvas.requestRenderAll();
};

export const resetCrop = (session: CropSession, canvas: Canvas) => {
  const s = session.snapshot;
  session.image.set({
    cropX: 0,
    cropY: 0,
    width: session.source.width,
    height: session.source.height,
    cropN: { x: 0, y: 0, w: 1, h: 1 },
    left: s.left,
    top: s.top,
    scaleX: s.scaleX,
    scaleY: s.scaleY,
    angle: s.angle
  });
  session.baseCrop = { x: 0, y: 0, w: session.source.width, h: session.source.height };
  session.imgCx = 0;
  session.imgCy = 0;
  session.frame.set({ left: s.left, top: s.top, angle: s.angle, width: session.image.getScaledWidth(), height: session.image.getScaledHeight(), scaleX: 1, scaleY: 1 });
  session.frame.setCoords();
  syncPreviewCrop(session);
  syncImageVisual(session);
  emitLive(session, canvas);
};

export const cancelCrop = (canvas: Canvas, session: CropSession) => {
  const s = session.snapshot;
  session.image.set({
    left: s.left,
    top: s.top,
    scaleX: s.scaleX,
    scaleY: s.scaleY,
    angle: s.angle,
    width: s.width,
    height: s.height,
    cropX: s.cropX,
    cropY: s.cropY,
    cropN: s.cropN,
    flipX: s.flipX,
    flipY: s.flipY,
    lockMovementX: s.lockMovementX,
    lockMovementY: s.lockMovementY,
    lockScalingX: s.lockScalingX,
    lockScalingY: s.lockScalingY,
    lockRotation: s.lockRotation,
    selectable: s.selectable,
    visible: true
  });
  session.image.setCoords();
  canvas.requestRenderAll();
};

export const closeCropSession = (canvas: Canvas, session: CropSession) => {
  session.unbind();
  canvas.remove(session.frame);
  canvas.remove(session.previewImage);
  session.image.set({
    lockMovementX: session.snapshot.lockMovementX,
    lockMovementY: session.snapshot.lockMovementY,
    lockScalingX: session.snapshot.lockScalingX,
    lockScalingY: session.snapshot.lockScalingY,
    lockRotation: session.snapshot.lockRotation,
    selectable: session.snapshot.selectable,
    visible: true
  });
  canvas.setActiveObject(session.image);
  canvas.requestRenderAll();
};


export type CropPresetValue = number | "free";

export const createCropModeController = (canvas: Canvas, onChange?: (info: CropLiveInfo) => void) => {
  let session: CropSession | null = null;

  return {
    enterCropMode(image: any) {
      if (session) {
        closeCropSession(canvas, session);
      }
      session = startCrop(canvas, image, onChange);
      return session;
    },
    applyCrop() {
      if (!session) return;
      applyCrop(session, canvas);
      closeCropSession(canvas, session);
      session = null;
    },
    cancelCrop() {
      if (!session) return;
      cancelCrop(canvas, session);
      closeCropSession(canvas, session);
      session = null;
    },
    resetCrop() {
      if (!session) return;
      resetCrop(session, canvas);
    },
    setPreset(ratio: CropPresetValue) {
      if (!session) return;
      setCropRatio(session, ratio === "free" ? null : ratio, canvas);
    },
    setCustomCropSizePx(wPx: number, hPx: number) {
      if (!session) return;
      setCropSizeFromSourcePixels(session, canvas, wPx, hPx);
    },
    getSession() {
      return session;
    }
  };
};
