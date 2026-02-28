import type { CropState, RectBox } from "./cropTypes";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const readScale = (value: unknown, fallback = 1) => {
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? Math.abs(n) : fallback;
};

const readNaturalSize = (image: any) => {
  const element = image?.getElement?.();
  const width = Math.max(1, Number(element?.naturalWidth ?? image?.width ?? 1));
  const height = Math.max(1, Number(element?.naturalHeight ?? image?.height ?? 1));
  return { width, height };
};

export const getImageDisplayRect = (image: any): RectBox => {
  const bounds = image?.getBoundingRect?.(true, true);
  if (bounds) {
    return {
      left: Number(bounds.left ?? 0),
      top: Number(bounds.top ?? 0),
      width: Math.max(1, Number(bounds.width ?? 1)),
      height: Math.max(1, Number(bounds.height ?? 1))
    };
  }

  const scaleX = readScale(image?.scaleX);
  const scaleY = readScale(image?.scaleY);

  return {
    left: Number(image?.left ?? 0),
    top: Number(image?.top ?? 0),
    width: Math.max(1, Number(image?.width ?? 1) * scaleX),
    height: Math.max(1, Number(image?.height ?? 1) * scaleY)
  };
};

export const clampRectWithinBounds = (rect: RectBox, bounds: RectBox): RectBox => {
  const width = clamp(rect.width, 1, bounds.width);
  const height = clamp(rect.height, 1, bounds.height);
  return {
    width,
    height,
    left: clamp(rect.left, bounds.left, bounds.left + bounds.width - width),
    top: clamp(rect.top, bounds.top, bounds.top + bounds.height - height)
  };
};

export const fitRectToAspectWithinBounds = (bounds: RectBox, aspect: number): RectBox => {
  if (!Number.isFinite(aspect) || aspect <= 0) return { ...bounds };

  let width = bounds.width;
  let height = width / aspect;

  if (height > bounds.height) {
    height = bounds.height;
    width = height * aspect;
  }

  return {
    width,
    height,
    left: bounds.left + (bounds.width - width) / 2,
    top: bounds.top + (bounds.height - height) / 2
  };
};

export const canvasCropRectToSourceParams = (image: any, cropRectCanvas: RectBox): CropState => {
  const bounds = getImageDisplayRect(image);
  const source = readNaturalSize(image);

  const safe = clampRectWithinBounds(cropRectCanvas, bounds);

  const relX = (safe.left - bounds.left) / bounds.width;
  const relY = (safe.top - bounds.top) / bounds.height;
  const relW = safe.width / bounds.width;
  const relH = safe.height / bounds.height;

  const cropX = clamp(relX * source.width, 0, source.width - 1);
  const cropY = clamp(relY * source.height, 0, source.height - 1);
  const cropW = clamp(relW * source.width, 1, source.width - cropX);
  const cropH = clamp(relH * source.height, 1, source.height - cropY);

  return {
    enabled: true,
    cropX,
    cropY,
    cropW,
    cropH,
    aspect: null
  };
};

export const sourceParamsToCanvasCropRect = (image: any, cropState: CropState): RectBox => {
  const bounds = getImageDisplayRect(image);
  const source = readNaturalSize(image);

  const left = bounds.left + (cropState.cropX / source.width) * bounds.width;
  const top = bounds.top + (cropState.cropY / source.height) * bounds.height;
  const width = (cropState.cropW / source.width) * bounds.width;
  const height = (cropState.cropH / source.height) * bounds.height;

  return clampRectWithinBounds({ left, top, width, height }, bounds);
};
