export const isShapeObject = (obj: any) => obj?.data?.type === "shape";

export const isRectLikeShape = (obj: any) => {
  const kind = obj?.data?.shapeKind;
  return isShapeObject(obj) && (kind === "rect" || kind === "square");
};

const drawCornerAwareRectPath = (ctx: CanvasRenderingContext2D, width: number, height: number, radii: RectCornerRadii) => {
  const halfW = width / 2;
  const halfH = height / 2;
  const maxRadius = Math.max(0, Math.min(halfW, halfH));

  const tl = clampCornerRadius(radii.tl, maxRadius);
  const tr = clampCornerRadius(radii.tr, maxRadius);
  const br = clampCornerRadius(radii.br, maxRadius);
  const bl = clampCornerRadius(radii.bl, maxRadius);

  const left = -halfW;
  const top = -halfH;
  const right = halfW;
  const bottom = halfH;

  ctx.beginPath();
  ctx.moveTo(left + tl, top);
  ctx.lineTo(right - tr, top);
  if (tr > 0) ctx.quadraticCurveTo(right, top, right, top + tr);
  else ctx.lineTo(right, top);

  ctx.lineTo(right, bottom - br);
  if (br > 0) ctx.quadraticCurveTo(right, bottom, right - br, bottom);
  else ctx.lineTo(right, bottom);

  ctx.lineTo(left + bl, bottom);
  if (bl > 0) ctx.quadraticCurveTo(left, bottom, left, bottom - bl);
  else ctx.lineTo(left, bottom);

  ctx.lineTo(left, top + tl);
  if (tl > 0) ctx.quadraticCurveTo(left, top, left + tl, top);
  else ctx.lineTo(left, top);
  ctx.closePath();
};

const applyCornerAwareRendering = (obj: any) => {
  if (!isRectLikeShape(obj) || obj?.__cornerAwareRenderingApplied) return;

  const originalRender = typeof obj?._render === "function" ? obj._render.bind(obj) : undefined;

  obj._render = function cornerAwareRender(this: any, ctx: CanvasRenderingContext2D) {
    const dataRadii = this?.data?.cornerRadii as Partial<RectCornerRadii> | undefined;
    const hasCustomRadii = dataRadii && [dataRadii.tl, dataRadii.tr, dataRadii.br, dataRadii.bl].some((n) => Number(n ?? 0) > 0);

    if (!hasCustomRadii || !this?.width || !this?.height || typeof this?._renderPaintInOrder !== "function") {
      originalRender?.(ctx);
      return;
    }

    drawCornerAwareRectPath(ctx, Number(this.width), Number(this.height), {
      tl: Number(dataRadii?.tl ?? this.rx ?? 0),
      tr: Number(dataRadii?.tr ?? this.rx ?? 0),
      br: Number(dataRadii?.br ?? this.rx ?? 0),
      bl: Number(dataRadii?.bl ?? this.rx ?? 0)
    });
    this._renderPaintInOrder(ctx);
  };

  obj.__cornerAwareRenderingApplied = true;
  markShapeVisualDirty(obj);
};

const abs = (n: unknown, fallback = 1) => Math.abs(Number.isFinite(Number(n)) ? Number(n) : fallback);

const getScaleSign = (n: unknown) => (Number(n) < 0 ? -1 : 1);

const markShapeVisualDirty = (obj: any) => {
  if (!obj) return;
  obj.dirty = true;
  if (obj.group) obj.group.dirty = true;
};

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
  if (obj.strokeUniform !== true) obj.strokeUniform = true;
};

export const ensureRectRadiusMetadata = (obj: any) => {
  if (!isRectLikeShape(obj)) return;
  const data = obj?.data ?? {};
  const radii = normalizeCornerRadii(obj);
  const uniform = Math.max(radii.tl, radii.tr, radii.br, radii.bl);
  obj.data = { ...data, cornerRadiusPx: uniform, cornerRadii: radii };
  applyCornerAwareRendering(obj);
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
  obj.data = { ...data, cornerRadiusPx: next, cornerRadii: nextRadii };
  Object.assign(obj, { rx: next, ry: next });
  markShapeVisualDirty(obj);
};

export const setRectCornerRadiiPx = (obj: any, radii: Partial<RectCornerRadii>) => {
  if (!isRectLikeShape(obj)) return;
  const nextRadii = normalizeCornerRadii(obj, radii);
  const uniform = Math.max(nextRadii.tl, nextRadii.tr, nextRadii.br, nextRadii.bl);
  const data = obj?.data ?? {};
  obj.data = { ...data, cornerRadiusPx: uniform, cornerRadii: nextRadii };
  // Fabric Rect supports uniform radius only; keep the largest one to avoid clipping artifacts.
  Object.assign(obj, { rx: uniform, ry: uniform });
  markShapeVisualDirty(obj);
};

export const setRectRadiusPxPreserveSize = (obj: any, radiusPx: number) => {
  if (!isRectLikeShape(obj)) return;

  const renderedW = Math.max(1, Number(obj?.width ?? 1) * abs(obj?.scaleX, 1));
  const renderedH = Math.max(1, Number(obj?.height ?? 1) * abs(obj?.scaleY, 1));
  const signX = getScaleSign(obj?.scaleX ?? 1);
  const signY = getScaleSign(obj?.scaleY ?? 1);

  setRectRadiusPx(obj, radiusPx);

  Object.assign(obj, {
    width: renderedW,
    height: renderedH,
    scaleX: signX,
    scaleY: signY,
    strokeUniform: true
  });
  markShapeVisualDirty(obj);
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

  Object.assign(obj, {
    width: renderedW,
    height: renderedH,
    scaleX: signX,
    scaleY: signY,
    rx: nextRadius,
    ry: nextRadius,
    strokeUniform: true
  });

  setRectCornerRadiiPx(obj, getRectCornerRadiiPx(obj));
  markShapeVisualDirty(obj);
};
