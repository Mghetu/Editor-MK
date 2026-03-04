import { applyObjectMutation, reorderObjectWithHistory } from "../../engine/history/mutator";
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
    .filter(({ obj }) => !obj?.data?.isCropOverlay)
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

export const toggleLockLayer = async (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (!obj) return;
  const data = ensureData(obj, "Layer");
  const locked = !data.locked;

  await applyObjectMutation(canvas, obj, (target) => {
    target.set("data", { ...data, locked });
    target.set({
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
      hasControls: !locked,
      selectable: !locked && target.visible !== false,
      evented: !locked && target.visible !== false
    });
  }, locked ? "Lock layer" : "Unlock layer");
};

export const toggleHideLayer = async (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (!obj) return;
  const data = ensureData(obj, "Layer");
  const hidden = !data.hidden;

  await applyObjectMutation(canvas, obj, (target, currentCanvas) => {
    target.set("data", { ...data, hidden });
    target.set({
      visible: !hidden,
      selectable: !hidden && !data.locked,
      evented: !hidden && !data.locked
    });
    if (hidden && currentCanvas.getActiveObject?.() === target) {
      currentCanvas.discardActiveObject();
    }
  }, hidden ? "Hide layer" : "Show layer");
};

export const bringForward = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (obj) {
    void reorderObjectWithHistory(canvas, obj, 1, "Bring forward");
  }
};

export const sendBackward = (canvas: Canvas, id: string) => {
  const obj = findLayerObject(canvas, id);
  if (obj) {
    void reorderObjectWithHistory(canvas, obj, -1, "Send backward");
  }
};
