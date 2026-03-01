import type { Canvas } from "fabric";
import { clampRectWithinBounds, canvasCropRectToSourceParams, fitRectToAspectWithinBounds, getImageDisplayRect, sourceParamsToCanvasCropRect } from "./cropMath";
import { createCropRect, createGrid, createMask, updateGrid, updateMask } from "./cropOverlay";
import type { CropMask } from "./cropOverlay";
import type { CropState, RectBox } from "./cropTypes";

const MIN_CROP_SIZE = 40;

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
  rect.set({
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
  activeImageState: { selectable: boolean; evented: boolean; hasControls: boolean };
  objectStates: Array<{ obj: any; selectable: boolean; evented: boolean }>;
};

type ImageSnapshot = {
  left: number;
  top: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
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

  constructor(canvas: Canvas, onUpdated?: () => void) {
    this.canvas = canvas;
    this.onUpdated = onUpdated;
  }

  isActive() {
    return Boolean(this.image && this.cropRect);
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
      cropY: Number(image.cropY ?? 0)
    };

    this.disableOtherInteractions(image);

    const sourceEl = image.getElement?.();
    const sourceW = Math.max(1, Number(sourceEl?.naturalWidth ?? image.width ?? 1));
    const sourceH = Math.max(1, Number(sourceEl?.naturalHeight ?? image.height ?? 1));

    const savedCrop = (image.cropState ?? image.__cropState ?? null) as CropState | null;
    const hasSavedCrop = Boolean(savedCrop?.enabled);

    if (hasSavedCrop) {
      const scaleX = Number(image.scaleX ?? 1);
      const scaleY = Number(image.scaleY ?? 1);
      image.set({
        left: this.snapshot.left - this.snapshot.cropX * scaleX,
        top: this.snapshot.top - this.snapshot.cropY * scaleY,
        cropX: 0,
        cropY: 0,
        width: sourceW,
        height: sourceH
      });
    }

    image.setCoords();
    this.imageBounds = getImageDisplayRect(image);

    const initialRect = hasSavedCrop
      ? sourceParamsToCanvasCropRect(image, savedCrop as CropState)
      : { ...this.imageBounds };

    this.currentAspect = savedCrop?.aspect ?? null;

    this.cropRect = createCropRect(initialRect);
    this.grid = createGrid(this.cropRect);
    this.mask = createMask(this.cropRect, this.imageBounds);

    this.mask.objects.forEach((segment) => this.canvas.add(segment));
    this.canvas.add(this.grid);
    this.canvas.add(this.cropRect);
    this.canvas.setActiveObject(this.cropRect);

    this.bindCropEvents();
    this.canvas.requestRenderAll();
    this.onUpdated?.();
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
    if (!this.image || !this.cropRect || !this.imageBounds) return;

    const rect = clampRectWithinBounds(toAppliedCropRect(this.cropRect), this.imageBounds);
    const crop = canvasCropRectToSourceParams(this.image, rect);
    crop.aspect = this.currentAspect;

    const scaleX = Number(this.image.scaleX ?? 1);
    const scaleY = Number(this.image.scaleY ?? 1);

    this.image.set({
      cropX: crop.cropX,
      cropY: crop.cropY,
      width: crop.cropW,
      height: crop.cropH,
      left: (this.imageBounds.left ?? 0) + crop.cropX * scaleX,
      top: (this.imageBounds.top ?? 0) + crop.cropY * scaleY,
      cropState: crop,
      __cropState: crop
    });

    this.image.setCoords();
    this.exit(false);
    this.canvas.requestRenderAll();
  }

  cancel() {
    if (!this.image || !this.snapshot) {
      this.exit();
      return;
    }

    this.image.set({
      left: this.snapshot.left,
      top: this.snapshot.top,
      width: this.snapshot.width,
      height: this.snapshot.height,
      cropX: this.snapshot.cropX,
      cropY: this.snapshot.cropY
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

    this.cropRect = null;
    this.grid = null;
    this.mask = null;
    this.imageBounds = null;
    this.currentAspect = null;
    this.snapshot = null;

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
    const moving = (evt: any) => {
      if (evt?.target !== this.cropRect || !this.cropRect || !this.imageBounds) return;
      const next = clampRectWithinBounds(toCanvasRect(this.cropRect), this.imageBounds);
      next.width = Math.max(MIN_CROP_SIZE, next.width);
      next.height = Math.max(MIN_CROP_SIZE, next.height);
      setRectFromBounds(this.cropRect, next);
      this.refreshOverlay();
    };

    const scaling = (evt: any) => {
      if (evt?.target !== this.cropRect || !this.cropRect || !this.imageBounds) return;

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

    const imageTransforming = (evt: any) => {
      if (evt?.target !== this.image) return;
      this.syncImageBoundsAndCropRect();
    };

    this.listeners = [
      { event: "object:moving", fn: moving },
      { event: "object:scaling", fn: scaling },
      { event: "object:moving", fn: imageTransforming },
      { event: "object:scaling", fn: imageTransforming }
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
    this.canvas.requestRenderAll();
  }

  private disableOtherInteractions(activeImage: any) {
    this.previousInteractionState = {
      canvasSelection: this.canvas.selection,
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
    this.previousInteractionState.objectStates.forEach(({ obj }) => {
      obj.set({ selectable: false, evented: false });
    });

    activeImage.set({ selectable: true, evented: true, hasControls: true });
  }

  private restoreInteractions() {
    if (!this.previousInteractionState) return;

    this.canvas.selection = this.previousInteractionState.canvasSelection;
    this.previousInteractionState.objectStates.forEach(({ obj, selectable, evented }) => {
      obj.set({ selectable, evented });
    });

    if (this.image) {
      const activeImageState = this.previousInteractionState.activeImageState;
      this.image.set({
        selectable: activeImageState.selectable,
        evented: activeImageState.evented,
        hasControls: activeImageState.hasControls
      });
    }

    this.previousInteractionState = null;
  }
}
