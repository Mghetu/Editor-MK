import { BatchSetPropertyCommand, RemoveObjectCommand } from "./commands/basic";
import { createFabricHistoryContext, getFabricObjectId } from "./fabricHistoryContext";
import type { CommandHistoryManager } from "./transactionHistory";

const getCommandHistory = (): CommandHistoryManager | undefined => (window as any).__commandHistory;

export const applyObjectProperties = async (canvas: any, obj: any, values: Record<string, unknown>, label = "Update object") => {
  const commandHistory = getCommandHistory();
  const objectId = getFabricObjectId(obj);

  if (!commandHistory || !objectId) {
    obj.set(values);
    obj.setCoords?.();
    canvas?.requestRenderAll?.();
    return;
  }

  const cmd = new BatchSetPropertyCommand(objectId, values);
  cmd.label = label;
  await commandHistory.execute(cmd, { source: "ui" });
};

export const removeObjectWithHistory = async (canvas: any, obj: any, label = "Delete object") => {
  const commandHistory = getCommandHistory();
  if (!commandHistory) {
    canvas.remove(obj);
    canvas.requestRenderAll?.();
    return;
  }

  const cmd = RemoveObjectCommand.fromObject(obj, createFabricHistoryContext(canvas), label);
  await commandHistory.execute(cmd, { source: "ui" });
};
