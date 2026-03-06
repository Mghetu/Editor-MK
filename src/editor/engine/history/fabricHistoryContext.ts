import { classRegistry, type Canvas } from "fabric";
import type { HistoryContext } from "./commands/types";

export const getFabricObjectId = (obj: any): string | undefined => obj?.data?.id ?? obj?.id;

export const createFabricHistoryContext = (canvas: Canvas): HistoryContext => ({
  canvas,
  getObjectId: getFabricObjectId,
  findObjectById: (id: string) => canvas.getObjects().find((obj: any) => getFabricObjectId(obj) === id),
  serializeObject: (obj: any) => obj.toObject(["data", "crop", "cropN", "cropState", "__cropState", "table"]),
  enlivenObject: async (serialized: Record<string, unknown>) => {
    const type = String(serialized?.type ?? "");
    const klass: any = classRegistry.getClass(type);
    if (!klass?.fromObject) throw new Error(`Unable to enliven object of type '${type}'`);
    return klass.fromObject(serialized);
  },
  addObject: (obj: any, index?: number) => {
    if (typeof index === "number" && index >= 0 && index < canvas.getObjects().length) {
      canvas.insertAt(index, obj);
      return;
    }
    canvas.add(obj);
  },
  removeObject: (obj: any) => {
    canvas.remove(obj);
  },
  render: () => {
    canvas.requestRenderAll?.();
  }
});
