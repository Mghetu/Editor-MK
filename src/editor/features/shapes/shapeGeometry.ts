export const isShapeObject = (obj: any) => obj?.data?.type === "shape";

export const isRectLikeShape = (obj: any) => {
  const kind = obj?.data?.shapeKind;
  return isShapeObject(obj) && (kind === "rect" || kind === "square");
};

const abs = (n: unknown, fallback = 1) => Math.abs(Number.isFinite(Number(n)) ? Number(n) : fallback);

const getScaleSign = (n: unknown) => (Number(n) < 0 ? -1 : 1);

const getVisualCornerRadiusFromObject = (obj: any) => {
  const rx = Math.max(0, Number(obj?.rx ?? obj?.ry ?? 0));
  const sx = abs(obj?.scaleX, 1);
  const sy = abs(obj?.scaleY, 1);
  return rx * Math.min(sx, sy);
};

export type RectCornerRadii = { tl: number; tr: number; br: number; bl: number };

const clampCornerRadius = (value: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0));

const getRenderedSizeWithoutStroke = (obj: any) => ({
  width: Math.max(1, Number(obj?.width ?? 1) * abs(obj?.scaleX, 1)),
  height: Math.max(1, Number(obj?.height ?? 1) * abs(obj?.scaleY, 1))
});

const normalizeCornerRadii = (obj: any, incoming?: Partial<RectCornerRadii>): RectCornerRadii => {
  const data = obj?.data ?? {};
  const legacy = Math.max(0, Number(data.cornerRadiusPx ?? getVisualCornerRadiusFromObject(obj) ?? 0));
  const existing = (data.cornerRadii ?? {}) as Partial<RectCornerRadii>;
  const size = getRenderedSizeWithoutStroke(obj);
  const maxAllowed = Math.max(0, Math.min(size.width, size.height) / 2);

  return {
    tl: clampCornerRadius(Number(incoming?.tl ?? existing.tl ?? legacy), maxAllowed),
    tr: clampCornerRadius(Number(incoming?.tr ?? existing.tr ?? legacy), maxAllowed),
    br: clampCornerRadius(Number(incoming?.br ?? existing.br ?? legacy), maxAllowed),
    bl: clampCornerRadius(Number(incoming?.bl ?? existing.bl ?? legacy), maxAllowed)
  };
};

export const ensureShapeStrokeUniform = (obj: any) => {
  if (!isShapeObject(obj)) return;
  if (obj.strokeUniform !== true) obj.set("strokeUniform", true);
};

export const ensureRectRadiusMetadata = (obj: any) => {
  if (!isRectLikeShape(obj)) return;
  const data = obj?.data ?? {};
  const radii = normalizeCornerRadii(obj);
  const uniform = Math.max(radii.tl, radii.tr, radii.br, radii.bl);
  obj.set("data", { ...data, cornerRadiusPx: uniform, cornerRadii: radii });
};

export const getRectCornerRadiiPx = (obj: any): RectCornerRadii => {
  if (!isRectLikeShape(obj)) return { tl: 0, tr: 0, br: 0, bl: 0 };
  ensureRectRadiusMetadata(obj);
  return normalizeCornerRadii(obj);
};

export const getRectRadiusPx = (obj: any) => {
  if (!isRectLikeShape(obj)) return 0;
  const radii = getRectCornerRadiiPx(obj);
  return Math.max(radii.tl, radii.tr, radii.br, radii.bl);
};

export const setRectRadiusPx = (obj: any, radiusPx: number) => {
  if (!isRectLikeShape(obj)) return;
  const nextRadii = normalizeCornerRadii(obj, {
    tl: radiusPx,
    tr: radiusPx,
    br: radiusPx,
    bl: radiusPx
  });
  const next = Math.max(nextRadii.tl, nextRadii.tr, nextRadii.br, nextRadii.bl);
  const data = obj?.data ?? {};
  obj.set("data", { ...data, cornerRadiusPx: next, cornerRadii: nextRadii });
  obj.set({ rx: next, ry: next });
};

export const setRectCornerRadiiPx = (obj: any, radii: Partial<RectCornerRadii>) => {
  if (!isRectLikeShape(obj)) return;
  const nextRadii = normalizeCornerRadii(obj, radii);
  const uniform = Math.max(nextRadii.tl, nextRadii.tr, nextRadii.br, nextRadii.bl);
  const data = obj?.data ?? {};
  obj.set("data", { ...data, cornerRadiusPx: uniform, cornerRadii: nextRadii });
  // Fabric Rect supports uniform radius only; keep the largest one to avoid clipping artifacts.
  obj.set({ rx: uniform, ry: uniform });
};

export const setRectRadiusPxPreserveSize = (obj: any, radiusPx: number) => {
  if (!isRectLikeShape(obj)) return;

  const renderedW = Math.max(1, Number(obj?.width ?? 1) * abs(obj?.scaleX, 1));
  const renderedH = Math.max(1, Number(obj?.height ?? 1) * abs(obj?.scaleY, 1));
  const signX = getScaleSign(obj?.scaleX ?? 1);
  const signY = getScaleSign(obj?.scaleY ?? 1);

  setRectRadiusPx(obj, radiusPx);

  obj.set({
    width: renderedW,
    height: renderedH,
    scaleX: signX,
    scaleY: signY,
    strokeUniform: true
  });
};

export const normalizeRectAfterTransform = (obj: any) => {
  if (!isRectLikeShape(obj)) return;

  ensureShapeStrokeUniform(obj);
  ensureRectRadiusMetadata(obj);

  const renderedW = Math.max(1, Math.round(abs(obj?.getScaledWidth?.() ?? (obj?.width ?? 1) * abs(obj?.scaleX, 1))));
  const renderedH = Math.max(1, Math.round(abs(obj?.getScaledHeight?.() ?? (obj?.height ?? 1) * abs(obj?.scaleY, 1))));
  const signX = getScaleSign(obj?.scaleX ?? 1);
  const signY = getScaleSign(obj?.scaleY ?? 1);
  const cornerRadiusPx = getRectRadiusPx(obj);
  const maxAllowed = Math.max(0, Math.min(renderedW, renderedH) / 2);
  const nextRadius = Math.min(cornerRadiusPx, maxAllowed);

  obj.set({
    width: renderedW,
    height: renderedH,
    scaleX: signX,
    scaleY: signY,
    rx: nextRadius,
    ry: nextRadius,
    strokeUniform: true
  });

  setRectCornerRadiiPx(obj, getRectCornerRadiiPx(obj));
};
