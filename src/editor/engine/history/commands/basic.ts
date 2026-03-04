import type { HistoryCommand, HistoryContext } from "./types";

type SerializedObject = Record<string, unknown>;

const mergeObjectIds = (a: string[] = [], b: string[] = []) => Array.from(new Set([...a, ...b]));

export class AddObjectCommand implements HistoryCommand {
  label = "Add object";
  objectIds?: string[];

  constructor(
    private serialized: SerializedObject,
    private index?: number
  ) {
    const id = serialized?.data && typeof serialized.data === "object" ? (serialized.data as any).id : undefined;
    this.objectIds = id ? [String(id)] : undefined;
  }

  static fromObject(obj: any, ctx: HistoryContext, label = "Add object") {
    const command = new AddObjectCommand(ctx.serializeObject(obj));
    command.label = label;
    return command;
  }

  async apply(ctx: HistoryContext) {
    const obj = await ctx.enlivenObject(this.serialized);
    ctx.addObject(obj, this.index);
    if (this.objectIds?.[0]) {
      const added = ctx.findObjectById(this.objectIds[0]);
      if (added) {
        ctx.canvas.setActiveObject?.(added);
      }
    }
    ctx.render();
  }

  revert(ctx: HistoryContext) {
    const id = this.objectIds?.[0];
    if (!id) return;
    const obj = ctx.findObjectById(id);
    if (!obj) return;
    ctx.removeObject(obj);
    ctx.render();
  }
}

export class RemoveObjectCommand implements HistoryCommand {
  label = "Remove object";
  objectIds?: string[];

  constructor(
    private objectId: string,
    private serialized?: SerializedObject,
    private index?: number
  ) {
    this.objectIds = [objectId];
  }

  static fromObject(obj: any, ctx: HistoryContext, label = "Remove object") {
    const id = ctx.getObjectId(obj);
    if (!id) throw new Error("RemoveObjectCommand requires stable object id");
    const index = (ctx.canvas.getObjects() as any[]).indexOf(obj);
    const command = new RemoveObjectCommand(id, ctx.serializeObject(obj), index);
    command.label = label;
    return command;
  }

  apply(ctx: HistoryContext) {
    const obj = ctx.findObjectById(this.objectId);
    if (!obj) return;
    if (!this.serialized) this.serialized = ctx.serializeObject(obj);
    this.index = (ctx.canvas.getObjects() as any[]).indexOf(obj);
    ctx.removeObject(obj);
    ctx.render();
  }

  async revert(ctx: HistoryContext) {
    if (!this.serialized) return;
    const obj = await ctx.enlivenObject(this.serialized);
    ctx.addObject(obj, this.index);
    ctx.canvas.setActiveObject?.(obj);
    ctx.render();
  }
}

export class BatchSetPropertyCommand implements HistoryCommand {
  label = "Update object";
  objectIds?: string[];

  constructor(
    private objectId: string,
    private nextValues: Record<string, unknown>,
    private previousValues?: Record<string, unknown>
  ) {
    this.objectIds = [objectId];
  }

  apply(ctx: HistoryContext) {
    const obj = ctx.findObjectById(this.objectId);
    if (!obj) throw new Error(`Cannot apply command; missing object ${this.objectId}`);
    if (!this.previousValues) {
      this.previousValues = Object.fromEntries(Object.keys(this.nextValues).map((key) => [key, obj.get?.(key) ?? obj[key]]));
    }
    obj.set(this.nextValues);
    obj.setCoords?.();
    ctx.render();
  }

  revert(ctx: HistoryContext) {
    const obj = ctx.findObjectById(this.objectId);
    if (!obj || !this.previousValues) return;
    obj.set(this.previousValues);
    obj.setCoords?.();
    ctx.render();
  }

  merge(next: HistoryCommand) {
    if (!(next instanceof BatchSetPropertyCommand)) return false;
    if (next.objectId !== this.objectId) return false;
    this.nextValues = { ...this.nextValues, ...next.nextValues };
    this.label = next.label;
    this.objectIds = mergeObjectIds(this.objectIds, next.objectIds);
    return true;
  }
}

export class SetTextCommand extends BatchSetPropertyCommand {
  constructor(objectId: string, text: string) {
    super(objectId, { text });
    this.label = "Edit text";
  }
}

export class TransformObjectCommand extends BatchSetPropertyCommand {
  constructor(objectId: string, nextValues: Record<string, unknown>, previousValues?: Record<string, unknown>) {
    super(objectId, nextValues, previousValues);
    this.label = "Transform object";
  }
}


export class ReplaceObjectStateCommand implements HistoryCommand {
  label = "Update object";
  objectIds?: string[];

  constructor(
    private objectId: string,
    private before: SerializedObject,
    private after: SerializedObject
  ) {
    this.objectIds = [objectId];
  }

  private async replaceWith(ctx: HistoryContext, snapshot: SerializedObject) {
    const existing = ctx.findObjectById(this.objectId);
    if (!existing) throw new Error(`Cannot replace state; missing object ${this.objectId}`);
    const index = (ctx.canvas.getObjects() as any[]).indexOf(existing);
    ctx.removeObject(existing);
    const next = await ctx.enlivenObject(snapshot);
    ctx.addObject(next, index);
    ctx.canvas.setActiveObject?.(next);
    ctx.render();
  }

  async apply(ctx: HistoryContext) {
    await this.replaceWith(ctx, this.after);
  }

  async revert(ctx: HistoryContext) {
    await this.replaceWith(ctx, this.before);
  }
}


type CropCommandState = {
  left: number;
  top: number;
  width: number;
  height: number;
  cropX: number;
  cropY: number;
  cropState?: unknown;
  __cropState?: unknown;
};

export class ApplyCropCommand implements HistoryCommand {
  label = "Apply crop";
  objectIds?: string[];

  constructor(
    private objectId: string,
    private before: CropCommandState,
    private after: CropCommandState
  ) {
    this.objectIds = [objectId];
  }

  private applyState(ctx: HistoryContext, state: CropCommandState) {
    const obj = ctx.findObjectById(this.objectId);
    if (!obj) throw new Error(`Cannot apply crop; missing object ${this.objectId}`);
    obj.set({
      left: state.left,
      top: state.top,
      width: state.width,
      height: state.height,
      cropX: state.cropX,
      cropY: state.cropY,
      cropState: state.cropState,
      __cropState: state.__cropState
    });
    obj.setCoords?.();
    ctx.render();
  }

  apply(ctx: HistoryContext) {
    this.applyState(ctx, this.after);
  }

  revert(ctx: HistoryContext) {
    this.applyState(ctx, this.before);
  }
}
