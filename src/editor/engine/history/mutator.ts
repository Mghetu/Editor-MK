import { BatchSetPropertyCommand, RemoveObjectCommand, ReplaceObjectStateCommand } from "./commands/basic";
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


export const applyObjectMutation = async (
  canvas: any,
  obj: any,
  mutate: (target: any, canvas: any) => void,
  label = "Update object"
) => {
  const commandHistory = getCommandHistory();
  const objectId = getFabricObjectId(obj);

  if (!commandHistory || !objectId) {
    mutate(obj, canvas);
    obj.setCoords?.();
    canvas?.requestRenderAll?.();
    return;
  }

  const ctx = createFabricHistoryContext(canvas);
  const before = ctx.serializeObject(obj);
  mutate(obj, canvas);
  obj.setCoords?.();
  const after = ctx.serializeObject(obj);
  const command = new ReplaceObjectStateCommand(objectId, before, after);
  command.label = label;
  await commandHistory.execute(command, { source: "ui", objectIds: [objectId] });
};
