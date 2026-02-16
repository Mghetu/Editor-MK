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

export const ensureShapeStrokeUniform = (obj: any) => {
  if (!isShapeObject(obj)) return;
  if (obj.strokeUniform !== true) obj.set("strokeUniform", true);
};

export const ensureRectRadiusMetadata = (obj: any) => {
  if (!isRectLikeShape(obj)) return;
  const data = obj?.data ?? {};
  const existing = Number(data.cornerRadiusPx);
  if (Number.isFinite(existing)) return;
  const migrated = getVisualCornerRadiusFromObject(obj);
  obj.set("data", { ...data, cornerRadiusPx: migrated });
};

export const getRectRadiusPx = (obj: any) => {
  if (!isRectLikeShape(obj)) return 0;
  ensureRectRadiusMetadata(obj);
  return Math.max(0, Number(obj?.data?.cornerRadiusPx ?? 0));
};

export const setRectRadiusPx = (obj: any, radiusPx: number) => {
  if (!isRectLikeShape(obj)) return;
  const next = Math.max(0, Number.isFinite(radiusPx) ? radiusPx : 0);
  const data = obj?.data ?? {};
  obj.set("data", { ...data, cornerRadiusPx: next });
  obj.set({ rx: next, ry: next });
};

export const setRectRadiusPxPreserveSize = (obj: any, radiusPx: number) => {
  if (!isRectLikeShape(obj)) return;

  const renderedW = Math.max(1, Number(obj?.getScaledWidth?.() ?? obj?.width ?? 1));
  const renderedH = Math.max(1, Number(obj?.getScaledHeight?.() ?? obj?.height ?? 1));
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

  obj.set({
    width: renderedW,
    height: renderedH,
    scaleX: signX,
    scaleY: signY,
    rx: cornerRadiusPx,
    ry: cornerRadiusPx,
    strokeUniform: true
  });
};
