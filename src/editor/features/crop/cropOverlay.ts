import { Group, Line, Rect } from "fabric";
import type { RectBox } from "./cropTypes";

const OVERLAY_DIM = "rgba(2, 6, 23, 0.45)";

const toRectBounds = (rect: any): RectBox => ({
  left: Number(rect.left ?? 0),
  top: Number(rect.top ?? 0),
  width: Math.max(1, Number(rect.width ?? 1) * Number(rect.scaleX ?? 1)),
  height: Math.max(1, Number(rect.height ?? 1) * Number(rect.scaleY ?? 1))
});

const makeLine = () =>
  new Line([0, 0, 1, 1], {
    stroke: "rgba(255,255,255,0.75)",
    strokeWidth: 1,
    evented: false,
    selectable: false,
    excludeFromExport: true
  });

export const createCropRect = (initialRect: RectBox) => {
  const cropRect = new Rect({
    ...initialRect,
    originX: "left",
    originY: "top",
    fill: "rgba(0,0,0,0)",
    stroke: "#38bdf8",
    strokeWidth: 2,
    hasBorders: false,
    hasRotatingPoint: false,
    lockRotation: true,
    cornerSize: 20,
    touchCornerSize: 28,
    transparentCorners: false,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#0284c7",
    borderColor: "#38bdf8",
    padding: 0,
    centeredScaling: true
  }) as any;

  cropRect.setControlsVisibility({ mtr: false });
  cropRect.set("data", { id: crypto.randomUUID(), type: "crop-frame", isCropOverlay: true });
  cropRect.excludeFromExport = true;
  return cropRect;
};

export const createGrid = (rect: any) => {
  const grid = new Group([makeLine(), makeLine(), makeLine(), makeLine()], {
    evented: false,
    selectable: false,
    excludeFromExport: true
  }) as any;
  updateGrid(grid, rect);
  return grid;
};

export const createMask = (rect: any, imageBounds: RectBox) => {
  const mask = new Group(
    [0, 1, 2, 3].map(
      () =>
        new Rect({
          left: 0,
          top: 0,
          width: 1,
          height: 1,
          fill: OVERLAY_DIM,
          strokeWidth: 0,
          evented: false,
          selectable: false,
          excludeFromExport: true
        })
    ),
    {
      evented: false,
      selectable: false,
      excludeFromExport: true
    }
  ) as any;

  updateMask(mask, rect, imageBounds);
  return mask;
};

export const updateGrid = (grid: any, cropRect: any) => {
  const b = toRectBounds(cropRect);
  const [v1, v2, h1, h2] = grid.getObjects();

  v1.set({ x1: b.left + b.width / 3, y1: b.top, x2: b.left + b.width / 3, y2: b.top + b.height });
  v2.set({ x1: b.left + (2 * b.width) / 3, y1: b.top, x2: b.left + (2 * b.width) / 3, y2: b.top + b.height });
  h1.set({ x1: b.left, y1: b.top + b.height / 3, x2: b.left + b.width, y2: b.top + b.height / 3 });
  h2.set({ x1: b.left, y1: b.top + (2 * b.height) / 3, x2: b.left + b.width, y2: b.top + (2 * b.height) / 3 });

  grid.setCoords();
};

export const updateMask = (mask: any, cropRect: any, imageBounds: RectBox) => {
  const b = toRectBounds(cropRect);
  const [top, right, bottom, left] = mask.getObjects();

  top.set({
    left: imageBounds.left,
    top: imageBounds.top,
    width: imageBounds.width,
    height: Math.max(0, b.top - imageBounds.top)
  });

  bottom.set({
    left: imageBounds.left,
    top: b.top + b.height,
    width: imageBounds.width,
    height: Math.max(0, imageBounds.top + imageBounds.height - (b.top + b.height))
  });

  left.set({
    left: imageBounds.left,
    top: b.top,
    width: Math.max(0, b.left - imageBounds.left),
    height: b.height
  });

  right.set({
    left: b.left + b.width,
    top: b.top,
    width: Math.max(0, imageBounds.left + imageBounds.width - (b.left + b.width)),
    height: b.height
  });

  mask.setCoords();
};
