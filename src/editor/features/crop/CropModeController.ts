import type { Canvas } from "fabric";
import { ApplyCropCommand, ReplaceObjectStateCommand } from "../../engine/history/commands/basic";
import { createFabricHistoryContext, getFabricObjectId } from "../../engine/history/fabricHistoryContext";
import { clampRectWithinBounds, canvasCropRectToSourceParams, fitRectToAspectWithinBounds, getImageDisplayRect, sourceParamsToCanvasCropRect } from "./cropMath";
import { createCropRect, createGrid, createMask, updateGrid, updateMask } from "./cropOverlay";
import type { CropMask } from "./cropOverlay";
import type { CropState, RectBox } from "./cropTypes";

const MIN_CROP_SIZE = 40;

const readScaleAbs = (value: unknown, fallback = 1) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return fallback;
  return Math.abs(n);
};

const toCanvasRect = (rect: any): RectBox => ({
  left: Number(rect.left ?? 0),
  top: Number(rect.top ?? 0),
  width: Math.max(1, Number(rect.width ?? 1) * Number(rect.scaleX ?? 1)),
  height: Math.max(1, Number(rect.height ?? 1) * Number(rect.scaleY ?? 1))
});

const toAppliedCropRect = (rect: any): RectBox => {
  const bounds = toCanvasRect(rect);
  const strokeX = Math.max(0, Number(rect.strokeWidth ?? 0) * Number(rect.scaleX ?? 1));
  const strokeY = Math.max(0, Number(rect.strokeWidth ?? 0) * Number(rect.scaleY ?? 1));

  return {
    left: bounds.left - strokeX / 2,
    top: bounds.top - strokeY / 2,
    width: Math.max(1, bounds.width + strokeX),
    height: Math.max(1, bounds.height + strokeY)
  };
};

const setRectFromBounds = (rect: any, bounds: RectBox) => {
  Object.assign(rect, {
    left: bounds.left,
    top: bounds.top,
    width: Math.max(MIN_CROP_SIZE, bounds.width),
    height: Math.max(MIN_CROP_SIZE, bounds.height),
    scaleX: 1,
    scaleY: 1
  });
  rect.setCoords();
};

type PreviousInteractionState = {
  canvasSelection: boolean;
  viewportTransform?: number[];
  activeImageState: { selectable: boolean; evented: boolean; hasControls: boolean };
  activeObject: any | null;
  objectStates: Array<{ obj: any; selectable: boolean; evented: boolean }>;
};

type ImageSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  angle: number;
  scaleX: number;
  scaleY: number;
  prevStroke: unknown;
  prevStrokeWidth: number;
  prevOpacity: number;
  cropState?: CropState | null;
  __cropState?: CropState | null;
};

export class CropModeController {
  private canvas: Canvas;
  private image: any | null = null;
  private cropRect: any | null = null;
  private grid: any | null = null;
  private mask: CropMask | null = null;
  private imageBounds: RectBox | null = null;
  private currentAspect: number | null = null;
  private previousInteractionState: PreviousInteractionState | null = null;
  private snapshot: ImageSnapshot | null = null;
  private onUpdated?: () => void;
  private listeners: Array<{ event: string; fn: (e: any) => void }> = [];
  private normalizedRotation = false;
  private cropZoomPercent = 100;

  constructor(canvas: Canvas, onUpdated?: () => void) {
    this.canvas = canvas;
    this.onUpdated = onUpdated;
  }

  isActive() {
    return Boolean(this.image && this.cropRect);
  }

  isRotationNormalizedForCrop() {
    return this.normalizedRotation;
  }

  getCropZoomPercent() {
    return this.cropZoomPercent;
  }

  enter(image: any) {
    if (!image || image?.data?.type !== "image") return;
    this.exit();

    this.image = image;
    this.snapshot = {
      left: Number(image.left ?? 0),
      top: Number(image.top ?? 0),
      width: Number(image.width ?? 1),
      height: Number(image.height ?? 1),
      cropX: Number(image.cropX ?? 0),
      cropY: Number(image.cropY ?? 0),
      angle: Number(image.angle ?? 0),
      scaleX: Number(image.scaleX ?? 1),
      scaleY: Number(image.scaleY ?? 1),
      prevStroke: image.stroke,
      prevStrokeWidth: Number(image.strokeWidth ?? 0),
      prevOpacity: Number(image.opacity ?? 1),
      cropState: (image.cropState ?? null) as CropState | null,
      __cropState: (image.__cropState ?? null) as CropState | null
    };

    this.disableOtherInteractions(image);

    const sourceEl = image.getElement?.();
    const sourceW = Math.max(1, Number(sourceEl?.naturalWidth ?? image.width ?? 1));
    const sourceH = Math.max(1, Number(sourceEl?.naturalHeight ?? image.height ?? 1));

    const savedCrop = (image.cropState ?? image.__cropState ?? null) as CropState | null;
    const hasSavedCrop = Boolean(savedCrop?.enabled);

    if (hasSavedCrop) {
      const scaleX = readScaleAbs(image.scaleX);
      const scaleY = readScaleAbs(image.scaleY);
      Object.assign(image, {
        left: this.snapshot.left - this.snapshot.cropX * scaleX,
        top: this.snapshot.top - this.snapshot.cropY * scaleY,
        cropX: 0,
        cropY: 0,
        width: sourceW,
        height: sourceH
      });
    }

    this.normalizedRotation = Math.abs(this.snapshot.angle) > 0.01;
    if (this.normalizedRotation) {
      Object.assign(image, { angle: 0 });
    }

    Object.assign(image, {
      selectable: true,
      evented: true,
      hasControls: true,
      cornerSize: 10,
      touchCornerSize: 18,
      transparentCorners: false,
      stroke: "#38bdf8",
      strokeWidth: Math.max(1, Number(this.snapshot.prevStrokeWidth ?? 0)),
      opacity: 1
    });
    image.setControlsVisibility?.({
      mt: false,
      mb: false,
      ml: false,
      mr: false,
      mtr: false
    });

    image.setCoords();
    this.imageBounds = getImageDisplayRect(image);

    const initialRect = hasSavedCrop
      ? sourceParamsToCanvasCropRect(image, savedCrop as CropState)
      : { ...this.imageBounds };

    this.currentAspect = savedCrop?.aspect ?? null;

    this.cropRect = createCropRect(initialRect);
    Object.assign(this.cropRect, {
      lockMovementX: true,
      lockMovementY: true,
      cornerSize: 20,
      touchCornerSize: 28,
      transparentCorners: false
    });
    this.cropRect.setControlsVisibility?.({ mtr: false });

    this.grid = createGrid(this.cropRect);
    this.mask = createMask(this.cropRect, this.imageBounds);

    this.mask.objects.forEach((segment) => this.canvas.add(segment));
    this.canvas.add(this.grid);
    this.canvas.add(this.cropRect);
    this.canvas.setActiveObject(this.image);

    void this.ensureFocusLayer();
    this.bindCropEvents();
    this.canvas.requestRenderAll();
    this.onUpdated?.();
  }

  setCropZoomPercent(percent: number) {
    const canvas: any = this.canvas;
    const next = Math.max(50, Math.min(300, Number(percent) || 100));
    this.cropZoomPercent = next;
    const zoom = next / 100;

    if (typeof canvas.setZoom === "function") {
      canvas.setZoom(zoom);
    }

    canvas.requestRenderAll?.();
  }

  setPreset(aspect: number | null) {
    if (!this.cropRect || !this.imageBounds) return;
    this.currentAspect = aspect;

    let next = toCanvasRect(this.cropRect);
    if (aspect) {
      next = fitRectToAspectWithinBounds(next, aspect);
      next = clampRectWithinBounds(next, this.imageBounds);
    }

    next.width = Math.max(MIN_CROP_SIZE, next.width);
    next.height = Math.max(MIN_CROP_SIZE, next.height);

    setRectFromBounds(this.cropRect, next);
    this.refreshOverlay();
  }

  apply() {
    if (!this.image || !this.cropRect || !this.imageBounds || !this.snapshot) return;

    const rect = clampRectWithinBounds(toAppliedCropRect(this.cropRect), this.imageBounds);
    const crop = canvasCropRectToSourceParams(this.image, rect);
    crop.aspect = this.currentAspect;

    const scaleX = readScaleAbs(this.image.scaleX);
    const scaleY = readScaleAbs(this.image.scaleY);

    const before = {
      left: this.snapshot.left,
      top: this.snapshot.top,
      width: this.snapshot.width,
      height: this.snapshot.height,
      cropX: this.snapshot.cropX,
      cropY: this.snapshot.cropY,
      angle: this.snapshot.angle,
      cropState: this.snapshot.cropState,
      __cropState: this.snapshot.__cropState
    };

    const after = {
      cropX: crop.cropX,
      cropY: crop.cropY,
      width: crop.cropW,
      height: crop.cropH,
      left: (this.imageBounds.left ?? 0) + crop.cropX * scaleX,
      top: (this.imageBounds.top ?? 0) + crop.cropY * scaleY,
      angle: this.snapshot.angle,
      cropState: crop,
      __cropState: crop
    };

    const commandHistory = (window as any).__commandHistory;
    const objectId = getFabricObjectId(this.image);
    if (commandHistory && objectId) {
      const cmd = new ApplyCropCommand(objectId, before, after);
      void commandHistory.execute(cmd, { source: "ui", objectIds: [objectId] });
    } else {
      Object.assign(this.image, after);
      this.image.setCoords();
    }

    Object.assign(this.image, {
      opacity: this.snapshot.prevOpacity,
      stroke: this.snapshot.prevStroke,
      strokeWidth: this.snapshot.prevStrokeWidth
    });

    this.exit(false);
    this.canvas.requestRenderAll();
  }

  async applyPermanently() {
    if (!this.image || !this.cropRect || !this.imageBounds || !this.snapshot) return;

    const commandHistory = (window as any).__commandHistory;
    const objectId = getFabricObjectId(this.image);
    const historyCtx = commandHistory ? createFabricHistoryContext(this.canvas) : null;
    const beforeSerialized = historyCtx && objectId ? historyCtx.serializeObject(this.image) : null;

    const rect = clampRectWithinBounds(toAppliedCropRect(this.cropRect), this.imageBounds);
    const crop = canvasCropRectToSourceParams(this.image, rect);
    const sourceEl = this.image.getElement?.();
    const cropW = Math.max(1, Math.round(crop.cropW));
    const cropH = Math.max(1, Math.round(crop.cropH));

    if (!sourceEl) {
      this.apply();
      return;
    }

    const bitmap = document.createElement("canvas");
    bitmap.width = cropW;
    bitmap.height = cropH;
    const ctx = bitmap.getContext("2d");
    if (!ctx) {
      this.apply();
      return;
    }

    ctx.drawImage(sourceEl, crop.cropX, crop.cropY, crop.cropW, crop.cropH, 0, 0, cropW, cropH);
    const url = bitmap.toDataURL("image/png");

    if (typeof this.image.setSrc === "function") {
      await this.image.setSrc(url);
    } else {
      this.image._element = bitmap;
    }

    const scaleX = readScaleAbs(this.image.scaleX);
    const scaleY = readScaleAbs(this.image.scaleY);

    Object.assign(this.image, {
      left: (this.imageBounds.left ?? 0) + crop.cropX * scaleX,
      top: (this.imageBounds.top ?? 0) + crop.cropY * scaleY,
      width: cropW,
      height: cropH,
      angle: this.snapshot.angle,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    });

    Object.assign(this.image, {
      opacity: this.snapshot.prevOpacity,
      stroke: this.snapshot.prevStroke,
      strokeWidth: this.snapshot.prevStrokeWidth
    });
    this.image.setCoords();

    if (commandHistory && historyCtx && objectId && beforeSerialized) {
      const afterSerialized = historyCtx.serializeObject(this.image);
      const command = new ReplaceObjectStateCommand(objectId, beforeSerialized, afterSerialized, {
        alreadyApplied: true
      });
      await commandHistory.execute(command, { source: "ui", objectIds: [objectId] });
    }

    const target = this.image;
    this.exit(false);
    this.canvas.requestRenderAll();
    this.canvas.fire("object:modified", { target });
  }

  cancel() {
    if (!this.image || !this.snapshot) {
      this.exit();
      return;
    }

    Object.assign(this.image, {
      left: this.snapshot.left,
      top: this.snapshot.top,
      width: this.snapshot.width,
      height: this.snapshot.height,
      cropX: this.snapshot.cropX,
      cropY: this.snapshot.cropY,
      angle: this.snapshot.angle,
      opacity: this.snapshot.prevOpacity,
      stroke: this.snapshot.prevStroke,
      strokeWidth: this.snapshot.prevStrokeWidth,
      cropState: this.snapshot.cropState,
      __cropState: this.snapshot.__cropState
    });

    this.image.setCoords();
    this.exit(false);
    this.canvas.requestRenderAll();
  }

  exit(shouldRender = true) {
    this.unbindCropEvents();

    if (this.cropRect) this.canvas.remove(this.cropRect);
    if (this.grid) this.canvas.remove(this.grid);
    if (this.mask) this.mask.objects.forEach((segment) => this.canvas.remove(segment));
    this.removeFocusLayer();

    this.cropRect = null;
    this.grid = null;
    this.mask = null;
    this.imageBounds = null;
    this.currentAspect = null;
    this.snapshot = null;
    this.normalizedRotation = false;

    this.restoreInteractions();

    if (this.image) {
      this.canvas.setActiveObject(this.image);
      this.image.setCoords();
    }

    this.image = null;

    if (shouldRender) this.canvas.requestRenderAll();
    this.onUpdated?.();
  }

  private syncImageBoundsAndCropRect() {
    if (!this.image || !this.cropRect) return;

    this.image.setCoords();
    this.imageBounds = getImageDisplayRect(this.image);

    if (!this.imageBounds) return;

    let next = clampRectWithinBounds(toCanvasRect(this.cropRect), this.imageBounds);

    if (this.currentAspect) {
      const fitted = fitRectToAspectWithinBounds(next, this.currentAspect);
      next = clampRectWithinBounds(fitted, this.imageBounds);
    }

    setRectFromBounds(this.cropRect, next);
    this.refreshOverlay();
  }

  private bindCropEvents() {
    const clampImageToCrop = () => {
      if (!this.image || !this.cropRect) return;
      const displayW = Math.max(1, Number(this.image.width ?? 1) * readScaleAbs(this.image.scaleX));
      const displayH = Math.max(1, Number(this.image.height ?? 1) * readScaleAbs(this.image.scaleY));
      const crop = toCanvasRect(this.cropRect);

      const minLeft = crop.left + crop.width - displayW;
      const maxLeft = crop.left;
      const minTop = crop.top + crop.height - displayH;
      const maxTop = crop.top;

      const clampedLeft = Math.min(maxLeft, Math.max(minLeft, Number(this.image.left ?? 0)));
      const clampedTop = Math.min(maxTop, Math.max(minTop, Number(this.image.top ?? 0)));
      Object.assign(this.image, { left: clampedLeft, top: clampedTop });
      this.image.setCoords();
      this.imageBounds = getImageDisplayRect(this.image);
      this.refreshOverlay();
    };

    const moving = (evt: any) => {
      if (!this.image || !this.cropRect || !this.imageBounds) return;
      if (evt?.target === this.image) {
        clampImageToCrop();
      }
    };

    const scaling = (evt: any) => {
      if (!this.cropRect || !this.imageBounds) return;

      if (evt?.target === this.image) {
        clampImageToCrop();
        return;
      }

      if (evt?.target !== this.cropRect) return;

      let next = toCanvasRect(this.cropRect);

      if (this.currentAspect) {
        const centerX = next.left + next.width / 2;
        const centerY = next.top + next.height / 2;
        const basedOnWidth = next.width / next.height >= this.currentAspect;

        if (basedOnWidth) {
          next.height = next.width / this.currentAspect;
        } else {
          next.width = next.height * this.currentAspect;
        }

        next.left = centerX - next.width / 2;
        next.top = centerY - next.height / 2;
      }

      next.width = Math.max(MIN_CROP_SIZE, next.width);
      next.height = Math.max(MIN_CROP_SIZE, next.height);
      next = clampRectWithinBounds(next, this.imageBounds);

      if (this.currentAspect) {
        const fitted = fitRectToAspectWithinBounds(next, this.currentAspect);
        next = clampRectWithinBounds(
          {
            ...fitted,
            width: Math.max(MIN_CROP_SIZE, fitted.width),
            height: Math.max(MIN_CROP_SIZE, fitted.height)
          },
          this.imageBounds
        );
      }

      setRectFromBounds(this.cropRect, next);
      this.refreshOverlay();
    };

    const onWheel = (evt: any) => {
      const e = evt?.e as WheelEvent | undefined;
      if (!e) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      const delta = e.deltaY > 0 ? -5 : 5;
      this.setCropZoomPercent(this.cropZoomPercent + delta);
    };

    this.listeners = [
      { event: "object:moving", fn: moving },
      { event: "object:scaling", fn: scaling },
      { event: "mouse:wheel", fn: onWheel }
    ];

    this.listeners.forEach(({ event, fn }) => this.canvas.on(event as any, fn as any));
  }

  private unbindCropEvents() {
    this.listeners.forEach(({ event, fn }) => this.canvas.off(event as any, fn as any));
    this.listeners = [];
  }

  private refreshOverlay() {
    if (!this.cropRect || !this.grid || !this.mask || !this.imageBounds) return;
    updateGrid(this.grid, this.cropRect);
    updateMask(this.mask, this.cropRect, this.imageBounds);
    this.refreshFocusLayer();
    this.canvas.requestRenderAll();
  }

  private disableOtherInteractions(activeImage: any) {
    this.previousInteractionState = {
      canvasSelection: this.canvas.selection,
      viewportTransform: Array.isArray((this.canvas as any).viewportTransform)
        ? [...((this.canvas as any).viewportTransform as number[])]
        : undefined,
      activeObject: this.canvas.getActiveObject?.() ?? null,
      activeImageState: {
        selectable: Boolean(activeImage.selectable),
        evented: Boolean(activeImage.evented),
        hasControls: Boolean(activeImage.hasControls)
      },
      objectStates: this.canvas
        .getObjects()
        .filter((obj: any) => obj !== activeImage)
        .map((obj: any) => ({
          obj,
          selectable: Boolean(obj.selectable),
          evented: Boolean(obj.evented)
        }))
    };

    this.canvas.selection = false;
    this.cropZoomPercent = 100;
    this.previousInteractionState.objectStates.forEach(({ obj }) => {
      Object.assign(obj, { selectable: false, evented: false });
    });

    Object.assign(activeImage, { selectable: true, evented: true, hasControls: true });
    this.canvas.setActiveObject?.(activeImage);
  }

  private restoreInteractions() {
    if (!this.previousInteractionState) return;

    this.canvas.selection = this.previousInteractionState.canvasSelection;
    if (this.previousInteractionState.viewportTransform) {
      (this.canvas as any).viewportTransform = [...this.previousInteractionState.viewportTransform];
      this.canvas.requestRenderAll?.();
    }
    this.previousInteractionState.objectStates.forEach(({ obj, selectable, evented }) => {
      Object.assign(obj, { selectable, evented });
    });

    if (this.image) {
      const activeImageState = this.previousInteractionState.activeImageState;
      Object.assign(this.image, {
        selectable: activeImageState.selectable,
        evented: activeImageState.evented,
        hasControls: activeImageState.hasControls
      });
    }

    const previousActive = this.previousInteractionState.activeObject;
    if (previousActive && this.canvas.getObjects().includes(previousActive)) {
      this.canvas.setActiveObject(previousActive);
    }

    this.previousInteractionState = null;
  }
}
