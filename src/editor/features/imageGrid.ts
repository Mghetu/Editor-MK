import { FabricImage, Group, Rect, type Canvas } from "fabric";

export type ImageGridMode = "fixed" | "responsive";
export type ImagePlacementMode = "cover" | "fit" | "crop";

type GridSlot = {
  id: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  imageSrc?: string;
  imageMode?: ImagePlacementMode;
  cropScale?: number;
  cropX?: number;
  cropY?: number;
  cornerRadius?: number;
  backgroundColor?: string;
};

export type ImageGridData = {
  id: string;
  type: "imageGrid";
  name: string;
  presetId: string;
  mode: ImageGridMode;
  columns: number;
  rows: number;
  gap: number;
  padding: number;
  responsiveMinCellWidth: number;
  isCustom: boolean;
  frameWidth: number;
  frameHeight: number;
  showGuides?: boolean;
  slots: GridSlot[];
};

type GridPreset = {
  id: string;
  name: string;
  description: string;
  columns: number;
  rows: number;
  slots?: Array<Pick<GridSlot, "row" | "col" | "rowSpan" | "colSpan">>;
  templateRects?: Array<{ x: number; y: number; w: number; h: number }>;
};

const DEFAULT_CELL_BACKGROUND = "#2c2c2c";

const createDefaultSlot = (partial: Partial<GridSlot> & Pick<GridSlot, "row" | "col">): GridSlot => ({
  id: crypto.randomUUID(),
  row: partial.row,
  col: partial.col,
  rowSpan: partial.rowSpan ?? 1,
  colSpan: partial.colSpan ?? 1,
  imageSrc: partial.imageSrc,
  imageMode: partial.imageMode ?? "cover",
  cropScale: partial.cropScale ?? 1,
  cropX: partial.cropX ?? 0,
  cropY: partial.cropY ?? 0,
  cornerRadius: partial.cornerRadius ?? 8,
  backgroundColor: partial.backgroundColor ?? DEFAULT_CELL_BACKGROUND
});

export const IMAGE_GRID_PRESETS: GridPreset[] = [
  { id: "equal-2x2", name: "2×2 Equal", description: "Balanced 4-photo layout", columns: 2, rows: 2 },
  { id: "equal-3x2", name: "3×2 Equal", description: "Six image spread", columns: 3, rows: 2 },
  { id: "equal-4x2", name: "4×2 Equal", description: "Wide collage", columns: 4, rows: 2 },
  {
    id: "hero-left",
    name: "Hero Left",
    description: "Large left tile + stacked right",
    columns: 3,
    rows: 2,
    slots: [
      { row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      { row: 0, col: 2 },
      { row: 1, col: 2 }
    ]
  },
  {
    id: "hero-top",
    name: "Hero Top",
    description: "Hero row + 3 bottoms",
    columns: 3,
    rows: 2,
    slots: [
      { row: 0, col: 0, colSpan: 3 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 }
    ]
  },
  {
    id: "mosaic-template",
    name: "Mosaic Template",
    description: "Normalized template converted to spans",
    columns: 4,
    rows: 4,
    templateRects: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.25 },
      { x: 0.5, y: 0.25, w: 0.25, h: 0.25 },
      { x: 0.75, y: 0.25, w: 0.25, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.75, w: 0.25, h: 0.25 }
    ]
  }
];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const templateRectsToSlots = (rects: Array<{ x: number; y: number; w: number; h: number }>, cols: number, rows: number): GridSlot[] =>
  rects.map((rect) => {
    const col = clamp(Math.round(rect.x * cols), 0, cols - 1);
    const row = clamp(Math.round(rect.y * rows), 0, rows - 1);
    const colSpan = clamp(Math.max(1, Math.round(rect.w * cols)), 1, cols - col);
    const rowSpan = clamp(Math.max(1, Math.round(rect.h * rows)), 1, rows - row);
    return createDefaultSlot({ row, col, colSpan, rowSpan });
  });

const getPresetSlots = (preset: GridPreset): GridSlot[] => {
  if (preset.slots?.length) {
    return preset.slots.map((slot) => createDefaultSlot(slot));
  }
  if (preset.templateRects?.length) {
    return templateRectsToSlots(preset.templateRects, preset.columns, preset.rows);
  }

  const slots: GridSlot[] = [];
  for (let r = 0; r < preset.rows; r += 1) {
    for (let c = 0; c < preset.columns; c += 1) {
      slots.push(createDefaultSlot({ row: r, col: c }));
    }
  }
  return slots;
};

const toRelativeCenter = (x: number, y: number, w: number, h: number) => ({ left: x + w / 2, top: y + h / 2 });

const getRenderedColumns = (data: ImageGridData, innerWidth: number) => {
  if (data.mode === "fixed") return Math.max(1, Math.round(data.columns));
  const minCell = Math.max(40, data.responsiveMinCellWidth);
  return clamp(Math.floor((innerWidth + data.gap) / (minCell + data.gap)), 1, Math.max(1, data.columns));
};

const buildResponsiveSlots = (data: ImageGridData, columns: number): GridSlot[] => {
  const baseSlots = data.slots.map((slot, index) => ({ ...slot, order: index }));
  return baseSlots.map((slot, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    return { ...slot, row, col, rowSpan: 1, colSpan: 1 };
  });
};

const setImagePlacement = (img: FabricImage, slot: GridSlot, w: number, h: number, cellLeft: number, cellTop: number) => {
  const baseW = Math.max(1, Number(img.width ?? 1));
  const baseH = Math.max(1, Number(img.height ?? 1));
  const coverScale = Math.max(w / baseW, h / baseH);
  const fitScale = Math.min(w / baseW, h / baseH);
  const placement = slot.imageMode ?? "cover";

  let scale = coverScale;
  if (placement === "fit") scale = fitScale;
  if (placement === "crop") scale = coverScale * Math.max(0.1, Number(slot.cropScale ?? 1));

  const cropX = Number(slot.cropX ?? 0);
  const cropY = Number(slot.cropY ?? 0);
  const radius = Math.max(0, Number(slot.cornerRadius ?? 0));

  img.set({
    scaleX: scale,
    scaleY: scale,
    left: cellLeft + cropX,
    top: cellTop + cropY,
    originX: "center",
    originY: "center",
    backgroundColor: slot.backgroundColor ?? DEFAULT_CELL_BACKGROUND
  });
  img.clipPath = new Rect({
    width: w,
    height: h,
    rx: radius,
    ry: radius,
    originX: "center",
    originY: "center",
    left: -cropX,
    top: -cropY,
    absolutePositioned: false
  });
};

const ensureSlotObject = (group: Group, slotId: string) => {
  const objects = (group as any)._objects as any[];
  const existing = objects.find((obj) => obj?.data?.slotId === slotId);
  if (existing) return existing;
  const placeholder = new Rect({
    width: 10,
    height: 10,
    rx: 8,
    ry: 8,
    fill: DEFAULT_CELL_BACKGROUND,
    stroke: "#666",
    strokeWidth: 1,
    data: { role: "slot", slotId },
    selectable: false,
    evented: false,
    originX: "center",
    originY: "center"
  });
  group.add(placeholder);
  return placeholder;
};

const relayout = (group: Group, data: ImageGridData) => {
  const width = Math.max(80, Number(data.frameWidth ?? group.width ?? 1));
  const height = Math.max(80, Number(data.frameHeight ?? group.height ?? 1));
  group.set({ width, height });
  const innerW = Math.max(1, width - data.padding * 2);
  const columns = getRenderedColumns(data, innerW);
  const slots = data.mode === "responsive" ? buildResponsiveSlots(data, columns) : data.slots;
  const rows = data.mode === "responsive" ? Math.max(1, Math.ceil(slots.length / columns)) : Math.max(1, data.rows);

  const cellW = Math.max(1, (innerW - data.gap * (columns - 1)) / columns);
  const innerH = Math.max(1, height - data.padding * 2);
  const cellH = Math.max(1, (innerH - data.gap * (rows - 1)) / rows);

  for (const slot of slots) {
    const slotObj = ensureSlotObject(group, slot.id);

    const x = -width / 2 + data.padding + slot.col * (cellW + data.gap);
    const y = -height / 2 + data.padding + slot.row * (cellH + data.gap);
    const w = cellW * (slot.colSpan ?? 1) + data.gap * ((slot.colSpan ?? 1) - 1);
    const h = cellH * (slot.rowSpan ?? 1) + data.gap * ((slot.rowSpan ?? 1) - 1);
    const { left, top } = toRelativeCenter(x, y, w, h);
    const cornerRadius = Math.max(0, Number(slot.cornerRadius ?? 8));

    slotObj.set({
      left,
      top,
      originX: "center",
      originY: "center",
      stroke: data.showGuides ? "#8b5cf6" : "#666",
      strokeWidth: data.showGuides ? 2 : 1,
      selectable: false,
      evented: false
    });

    if (slotObj.type === "image") {
      slotObj.set({ strokeWidth: 0, stroke: undefined });
      setImagePlacement(slotObj as FabricImage, slot, w, h, left, top);
    } else {
      slotObj.set({ width: w, height: h, rx: cornerRadius, ry: cornerRadius, fill: slot.backgroundColor ?? DEFAULT_CELL_BACKGROUND });
    }
  }

  group.set({ dirty: true });
  group.setCoords();
};

const createSlotObject = async (slot: GridSlot) => {
  if (slot.imageSrc) {
    try {
      const img = await FabricImage.fromURL(slot.imageSrc, { crossOrigin: "anonymous" });
      img.set({ data: { role: "slot", slotId: slot.id }, selectable: false, evented: false, originX: "center", originY: "center" });
      return img;
    } catch {
      // fall through
    }
  }

  return new Rect({
    width: 10,
    height: 10,
    rx: Number(slot.cornerRadius ?? 8),
    ry: Number(slot.cornerRadius ?? 8),
    fill: slot.backgroundColor ?? DEFAULT_CELL_BACKGROUND,
    stroke: "#666",
    strokeWidth: 1,
    data: { role: "slot", slotId: slot.id },
    selectable: false,
    evented: false,
    originX: "center",
    originY: "center"
  });
};

const normalizeGridScale = (grid: Group, data: ImageGridData) => {
  const sx = Number(grid.scaleX ?? 1);
  const sy = Number(grid.scaleY ?? 1);
  if (Math.abs(sx) === 1 && Math.abs(sy) === 1) {
    grid.set({ width: Math.max(80, Number(data.frameWidth ?? grid.width ?? 1)), height: Math.max(80, Number(data.frameHeight ?? grid.height ?? 1)) });
    return data;
  }

  const next: ImageGridData = {
    ...data,
    frameWidth: Math.max(80, Number(data.frameWidth ?? grid.width ?? 1) * Math.abs(sx)),
    frameHeight: Math.max(80, Number(data.frameHeight ?? grid.height ?? 1) * Math.abs(sy))
  };

  grid.set({
    width: next.frameWidth,
    height: next.frameHeight,
    scaleX: sx < 0 ? -1 : 1,
    scaleY: sy < 0 ? -1 : 1
  });

  return next;
};

const normalizeSlotsForGridDimensions = (data: ImageGridData): ImageGridData => {
  if (data.mode !== "fixed") return data;
  const slots = [...data.slots];
  const used = new Set(slots.map((slot) => `${slot.row}:${slot.col}`));
  for (let r = 0; r < data.rows; r += 1) {
    for (let c = 0; c < data.columns; c += 1) {
      const key = `${r}:${c}`;
      if (used.has(key)) continue;
      slots.push(createDefaultSlot({ row: r, col: c }));
      used.add(key);
    }
  }
  return { ...data, slots };
};

export const createImageGrid = async (canvas: Canvas, presetId: string) => {
  const preset = IMAGE_GRID_PRESETS.find((entry) => entry.id === presetId) ?? IMAGE_GRID_PRESETS[0];
  const data: ImageGridData = {
    id: crypto.randomUUID(),
    type: "imageGrid",
    name: `Image Grid - ${preset.name}`,
    presetId: preset.id,
    mode: "fixed",
    columns: preset.columns,
    rows: preset.rows,
    gap: 12,
    padding: 12,
    responsiveMinCellWidth: 160,
    isCustom: false,
    frameWidth: 520,
    frameHeight: 360,
    showGuides: false,
    slots: getPresetSlots(preset)
  };

  const objects = await Promise.all(data.slots.map((slot) => createSlotObject(slot)));
  const group = new Group(objects, {
    left: 120,
    top: 120,
    width: data.frameWidth,
    height: data.frameHeight,
    originX: "left",
    originY: "top",
    subTargetCheck: false
  });
  (group as any).set("data", data);

  const normalized = normalizeGridScale(group, data);
  relayout(group, normalized);
  (group as any).set("data", normalized);
  canvas.add(group);
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
};

export const updateSelectedImageGrid = (canvas: Canvas, updater: (data: ImageGridData) => ImageGridData) => {
  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "imageGrid") return;
  const next = normalizeSlotsForGridDimensions(updater({ ...((active as any).data as ImageGridData) }));
  const normalized = normalizeGridScale(active, next);
  (active as any).set("data", normalized);
  relayout(active, normalized);
  canvas.requestRenderAll();
};

export const updateSelectedImageGridSlot = (canvas: Canvas, slotId: string, patch: Partial<GridSlot>) => {
  updateSelectedImageGrid(canvas, (data) => ({
    ...data,
    slots: data.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot))
  }));
};

export const refreshImageGrids = (canvas: Canvas) => {
  canvas.getObjects().forEach((obj) => {
    if ((obj as any)?.data?.type !== "imageGrid") return;
    const grid = obj as Group;
    const data = (grid as any).data as ImageGridData;
    const normalized = normalizeGridScale(grid, data);
    (grid as any).set("data", normalized);
    relayout(grid, normalized);
  });
  canvas.requestRenderAll();
};

const replaceSlotObject = async (grid: Group, slotId: string, src: string) => {
  const objects = (grid as any)._objects as any[];
  const index = objects.findIndex((obj) => obj?.data?.slotId === slotId);
  if (index < 0) return;

  const data = (grid as any).data as ImageGridData | undefined;
  const frame = {
    left: Number(grid.left ?? 0),
    top: Number(grid.top ?? 0),
    width: Math.max(80, Number(data?.frameWidth ?? grid.width ?? 1)),
    height: Math.max(80, Number(data?.frameHeight ?? grid.height ?? 1)),
    scaleX: Number(grid.scaleX ?? 1),
    scaleY: Number(grid.scaleY ?? 1)
  };

  const img = await FabricImage.fromURL(src, { crossOrigin: "anonymous" });
  img.set({
    data: { role: "slot", slotId },
    selectable: false,
    evented: false,
    originX: "center",
    originY: "center",
    strokeWidth: 0,
    stroke: undefined
  });

  grid.remove(objects[index]);
  grid.insertAt(index, img);
  grid.set(frame);
  grid.setCoords();
};

export const replaceSelectedImageGridSlot = async (canvas: Canvas, slotId: string, file: File) => {
  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "imageGrid") return;
  const src = URL.createObjectURL(file);
  await replaceSlotObject(active, slotId, src);
  updateSelectedImageGridSlot(canvas, slotId, { imageSrc: src });
};

export const addImagesToSelectedImageGrid = async (canvas: Canvas, files: File[]) => {
  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "imageGrid" || files.length === 0) return;

  const current = (active as any).data as ImageGridData;
  const emptySlots = current.slots.filter((slot) => !slot.imageSrc);
  const remainingSlots = current.slots.filter((slot) => slot.imageSrc);
  const orderedTargets = [...emptySlots, ...remainingSlots].slice(0, files.length);

  for (let index = 0; index < orderedTargets.length; index += 1) {
    const slot = orderedTargets[index];
    const src = URL.createObjectURL(files[index]);
    await replaceSlotObject(active, slot.id, src);
    updateSelectedImageGridSlot(canvas, slot.id, { imageSrc: src });
  }
};

export const shuffleSelectedImageGrid = (canvas: Canvas) => {
  updateSelectedImageGrid(canvas, (data) => {
    const sources = data.slots.map((slot) => slot.imageSrc).filter(Boolean) as string[];
    for (let i = sources.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sources[i], sources[j]] = [sources[j], sources[i]];
    }
    let cursor = 0;
    return {
      ...data,
      slots: data.slots.map((slot) => (slot.imageSrc ? { ...slot, imageSrc: sources[cursor++] } : slot))
    };
  });

  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "imageGrid") return;
  const data = (active as any).data as ImageGridData;
  void Promise.all(data.slots.filter((slot) => slot.imageSrc).map((slot) => replaceSlotObject(active, slot.id, slot.imageSrc!))).then(() => refreshImageGrids(canvas));
};

export const swapSelectedImageGrid = (canvas: Canvas) => {
  updateSelectedImageGrid(canvas, (data) => {
    const withImages = data.slots.filter((slot) => slot.imageSrc);
    if (withImages.length < 2) return data;
    const [first, second] = withImages;
    return {
      ...data,
      slots: data.slots.map((slot) => {
        if (slot.id === first.id) return { ...slot, imageSrc: second.imageSrc };
        if (slot.id === second.id) return { ...slot, imageSrc: first.imageSrc };
        return slot;
      })
    };
  });
  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "imageGrid") return;
  const data = (active as any).data as ImageGridData;
  void Promise.all(data.slots.filter((slot) => slot.imageSrc).map((slot) => replaceSlotObject(active, slot.id, slot.imageSrc!))).then(() => refreshImageGrids(canvas));
};

export const convertSelectedImageGridToCustom = (canvas: Canvas) => {
  updateSelectedImageGrid(canvas, (data) => ({ ...data, isCustom: true, presetId: "custom" }));
};

export const enableImageGridReflowBehavior = (canvas: Canvas) => {
  const onModified = ({ target }: any) => {
    if (!target || target?.data?.type !== "imageGrid") return;
    const grid = target as Group;
    const data = (grid as any).data as ImageGridData;
    const normalized = normalizeGridScale(grid, data);
    (grid as any).set("data", normalized);
    relayout(grid, normalized);
    canvas.requestRenderAll();
  };

  canvas.on("object:modified", onModified);
  return () => canvas.off("object:modified", onModified);
};
