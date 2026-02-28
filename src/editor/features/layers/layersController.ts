import type { Canvas } from "fabric";

export type LayerItem = {
  index: number;
  id: string;
  name: string;
  type: string;
  locked: boolean;
  hidden: boolean;
  active: boolean;
};

const ensureData = (obj: any, fallbackName: string) => {
  const existing = obj?.data ?? {};
  const data = {
    id: existing.id ?? crypto.randomUUID(),
    name: existing.name ?? fallbackName,
    type: existing.type ?? obj?.type ?? "object",
    locked: Boolean(existing.locked),
    hidden: Boolean(existing.hidden)
  };
  obj.set("data", data);
  return data;
};

export const listLayers = (canvas: Canvas): LayerItem[] => {
  const active = canvas.getActiveObject();
  return canvas
    .getObjects()
    .map((obj: any, index) => ({ obj, index }))
    .filter(({ obj }) => obj?.data?.type !== "crop-frame")
    .map(({ obj, index }) => {
      const data = ensureData(obj, `Layer ${index + 1}`);
      return {
        index,
        id: data.id,
        name: data.name,
        type: data.type,
        locked: data.locked,
        hidden: data.hidden,
        active: active === obj
      };
    })
    .reverse();
};

const findLayerObject = (canvas: Canvas, id: string) => canvas.getObjects().find((o: any) => o?.data?.id === id) as any;

export const selectLayer = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (!obj || obj.visible === false) return;
  canvas.setActiveObject(obj);
  canvas.renderAll();
};

export const toggleLockLayer = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (!obj) return;
  const data = ensureData(obj, "Layer");
  const locked = !data.locked;
  obj.set("data", { ...data, locked });
  obj.set({
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
    selectable: !locked && obj.visible !== false,
    evented: !locked && obj.visible !== false
  });
  canvas.renderAll();
};

export const toggleHideLayer = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (!obj) return;
  const data = ensureData(obj, "Layer");
  const hidden = !data.hidden;
  obj.set("data", { ...data, hidden });
  obj.set({
    visible: !hidden,
    selectable: !hidden && !data.locked,
    evented: !hidden && !data.locked
  });
  if (hidden && canvas.getActiveObject() === obj) {
    canvas.discardActiveObject();
  }
  canvas.renderAll();
};

export const bringForward = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (obj) {
    canvas.bringObjectForward(obj);
    canvas.renderAll();
  }
};

export const sendBackward = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (obj) {
    canvas.sendObjectBackwards(obj);
    canvas.renderAll();
  }
};
