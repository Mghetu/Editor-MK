import { Group, type Canvas } from "fabric";

export type AutoLayoutDirection = "row" | "column";
export type AutoLayoutAlign = "start" | "center" | "end";

export type AutoLayoutData = {
  id: string;
  type: "autoLayout";
  name: string;
  direction: AutoLayoutDirection;
  gap: number;
  padding: number;
  align: AutoLayoutAlign;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getItemSize = (obj: any) => ({
  width: Math.max(1, Number(obj?.getScaledWidth?.() ?? obj?.width ?? 1)),
  height: Math.max(1, Number(obj?.getScaledHeight?.() ?? obj?.height ?? 1))
});

const getAutoLayoutData = (group: Group): AutoLayoutData | null => {
  const data = (group as any)?.data as AutoLayoutData | undefined;
  if (!data || data.type !== "autoLayout") return null;
  return data;
};

const getLayoutChildren = (group: Group) => ((group as any)?._objects as any[] | undefined)?.filter(Boolean) ?? [];

const relayoutAutoLayoutGroup = (group: Group, data: AutoLayoutData) => {
  const items = getLayoutChildren(group);
  if (!items.length) return;

  const gap = Math.max(0, Number(data.gap ?? 0));
  const padding = Math.max(0, Number(data.padding ?? 0));
  const sizes = items.map(getItemSize);

  const mainSizes = sizes.map((size) => (data.direction === "row" ? size.width : size.height));
  const crossSizes = sizes.map((size) => (data.direction === "row" ? size.height : size.width));

  const mainTotal = mainSizes.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, items.length - 1);
  const crossMax = Math.max(...crossSizes);

  const contentW = data.direction === "row" ? mainTotal : crossMax;
  const contentH = data.direction === "row" ? crossMax : mainTotal;
  const nextWidth = Math.max(1, contentW + padding * 2);
  const nextHeight = Math.max(1, contentH + padding * 2);

  const center = group.getCenterPoint();
  group.set({ width: nextWidth, height: nextHeight });
  group.setPositionByOrigin(center, "center", "center");

  let cursor = data.direction === "row"
    ? -nextWidth / 2 + padding
    : -nextHeight / 2 + padding;

  items.forEach((item, index) => {
    const size = sizes[index];
    const itemW = size.width;
    const itemH = size.height;

    if (data.direction === "row") {
      const left = cursor + itemW / 2;
      let top = 0;
      const alignSpan = nextHeight - padding * 2;
      if (data.align === "start") top = -nextHeight / 2 + padding + itemH / 2;
      if (data.align === "center") top = -alignSpan / 2 + 0;
      if (data.align === "end") top = nextHeight / 2 - padding - itemH / 2;
      item.set({ left, top, originX: "center", originY: "center" });
      cursor += itemW + gap;
    } else {
      const top = cursor + itemH / 2;
      let left = 0;
      const alignSpan = nextWidth - padding * 2;
      if (data.align === "start") left = -nextWidth / 2 + padding + itemW / 2;
      if (data.align === "center") left = -alignSpan / 2 + 0;
      if (data.align === "end") left = nextWidth / 2 - padding - itemW / 2;
      item.set({ left, top, originX: "center", originY: "center" });
      cursor += itemH + gap;
    }

    item.setCoords?.();
  });

  group.setCoords();
};

export const createAutoLayoutFromSelection = (canvas: Canvas) => {
  const active = canvas.getActiveObject() as any;
  if (!active) return;

  let group: Group | null = null;
  if (String(active?.type ?? "").toLowerCase() === "activeselection") {
    group = (active as any).toGroup() as Group;
  } else if (String(active?.type ?? "").toLowerCase() === "group") {
    group = active as Group;
  }

  if (!group) return;

  const currentData = getAutoLayoutData(group);
  const data: AutoLayoutData = currentData ?? {
    id: (group as any)?.data?.id ?? crypto.randomUUID(),
    type: "autoLayout",
    name: "Auto Layout",
    direction: "row",
    gap: 16,
    padding: 16,
    align: "center"
  };

  (group as any).set("data", data);
  relayoutAutoLayoutGroup(group, data);
  canvas.setActiveObject(group);
  canvas.requestRenderAll();
};

export const updateSelectedAutoLayout = (canvas: Canvas, patch: Partial<AutoLayoutData>) => {
  const active = canvas.getActiveObject() as Group;
  if (!active || (active as any)?.data?.type !== "autoLayout") return;

  const current = getAutoLayoutData(active);
  if (!current) return;
  const next: AutoLayoutData = {
    ...current,
    ...patch,
    type: "autoLayout",
    gap: clamp(Number(patch.gap ?? current.gap ?? 0), 0, 200),
    padding: clamp(Number(patch.padding ?? current.padding ?? 0), 0, 240)
  };

  (active as any).set("data", next);
  relayoutAutoLayoutGroup(active, next);
  canvas.requestRenderAll();
};

export const refreshAutoLayouts = (canvas: Canvas) => {
  canvas.getObjects().forEach((obj: any) => {
    if (obj?.data?.type !== "autoLayout") return;
    const data = getAutoLayoutData(obj as Group);
    if (!data) return;
    relayoutAutoLayoutGroup(obj as Group, data);
  });
  canvas.requestRenderAll();
};

export const enableAutoLayoutBehavior = (canvas: Canvas) => {
  canvas.on("object:modified", ({ target }) => {
    if (!target || (target as any)?.data?.type !== "autoLayout") return;
    const data = getAutoLayoutData(target as Group);
    if (!data) return;
    relayoutAutoLayoutGroup(target as Group, data);
    canvas.requestRenderAll();
  });
};
