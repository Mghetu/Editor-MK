import { describe, expect, it } from "vitest";
import { ApplyCropCommand, BatchSetPropertyCommand, ReorderObjectCommand, ReplaceObjectStateCommand } from "./commands/basic";
import { CommandHistoryManager } from "./transactionHistory";
import type { HistoryContext } from "./commands/types";

const createMockContext = () => {
  const ordered: any[] = [];
  const objects = new Map<string, any>();
  const add = (obj: any) => { objects.set(String(obj.id), obj); ordered.push(obj); };
  add({ id: "a", x: 0, set(values: Record<string, unknown>) { Object.assign(this, values); }, get(key: string) { return (this as any)[key]; }, setCoords() {} });

  const ctx: HistoryContext = {
    canvas: {
      getObjects: () => ordered,
      moveObjectTo: (obj: any, index: number) => {
        const current = ordered.indexOf(obj);
        if (current < 0) return;
        ordered.splice(current, 1);
        ordered.splice(index, 0, obj);
      }
    } as any,
    getObjectId: (obj: any) => obj?.id,
    findObjectById: (id: string) => objects.get(id),
    serializeObject: (obj: any) => ({ ...obj }),
    enlivenObject: async (serialized) => ({ ...serialized }),
    addObject: (obj: any) => {
      objects.set(String(obj.id), obj);
      ordered.push(obj);
    },
    removeObject: (obj: any) => {
      objects.delete(String(obj.id));
      const idx = ordered.indexOf(obj);
      if (idx >= 0) ordered.splice(idx, 1);
    },
    render: () => {}
  };

  return { ctx, objects, ordered };
};

describe("BatchSetPropertyCommand", () => {
  it("is symmetric for apply/revert", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    await manager.execute(new BatchSetPropertyCommand("a", { x: 10 }), { source: "ui" });
    expect(objects.get("a")?.x).toBe(10);
    await manager.undo();
    expect(objects.get("a")?.x).toBe(0);
    await manager.redo();
    expect(objects.get("a")?.x).toBe(10);
  });

  it("merges repeated commands in transaction", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    manager.beginTransaction("Transform", { source: "interaction" });
    await manager.execute(new BatchSetPropertyCommand("a", { x: 5 }));
    await manager.execute(new BatchSetPropertyCommand("a", { x: 15 }));
    manager.commitTransaction();
    expect(objects.get("a")?.x).toBe(15);
    await manager.undo();
    expect(objects.get("a")?.x).toBe(0);
  });



  it("replaces serialized object state symmetrically", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    await manager.execute(new ReplaceObjectStateCommand("a", { id: "a", x: 0 }, { id: "a", x: 22 }), { source: "ui" });
    expect(objects.get("a")?.x).toBe(22);
    await manager.undo();
    expect(objects.get("a")?.x).toBe(0);
  });



  it("applies and reverts crop state changes", async () => {
    const { ctx, objects } = createMockContext();
    objects.set("img", {
      id: "img",
      left: 0,
      top: 0,
      width: 200,
      height: 120,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null,
      set(values: Record<string, unknown>) { Object.assign(this, values); },
      get(key: string) { return (this as any)[key]; },
      setCoords() {}
    });
    const manager = new CommandHistoryManager(ctx);
    await manager.execute(new ApplyCropCommand(
      "img",
      { left: 0, top: 0, width: 200, height: 120, cropX: 0, cropY: 0, cropState: null, __cropState: null },
      { left: 20, top: 10, width: 80, height: 60, cropX: 20, cropY: 10, cropState: { enabled: true }, __cropState: { enabled: true } }
    ));
    expect(objects.get("img")?.width).toBe(80);
    expect(objects.get("img")?.cropX).toBe(20);
    await manager.undo();
    expect(objects.get("img")?.width).toBe(200);
    expect(objects.get("img")?.cropX).toBe(0);
  });



  it("reorders layer and restores on undo", async () => {
    const { ctx, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    const b = { id: "b", set(values: Record<string, unknown>) { Object.assign(this, values); }, get(key: string) { return (this as any)[key]; }, setCoords() {} };
    const c = { id: "c", set(values: Record<string, unknown>) { Object.assign(this, values); }, get(key: string) { return (this as any)[key]; }, setCoords() {} };
    ordered.push(b, c);

    await manager.execute(new ReorderObjectCommand("a", 0, 2));
    expect(ordered.map((obj) => obj.id)).toEqual(["b", "c", "a"]);
    await manager.undo();
    expect(ordered.map((obj) => obj.id)).toEqual(["a", "b", "c"]);
  });



  it("throws on nested beginTransaction", () => {
    const { ctx } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    manager.beginTransaction("outer", { source: "ui" });
    expect(() => manager.beginTransaction("inner", { source: "ui" })).toThrowError("History transaction already in progress");
  });

  it("does not create history entry for empty transaction commit", () => {
    const { ctx } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    manager.beginTransaction("noop", { source: "ui" });
    manager.commitTransaction();
    expect(manager.canUndo).toBe(false);
  });

  it("rolls back in-flight transaction", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    manager.beginTransaction("Edit", { source: "ui" });
    await manager.execute(new BatchSetPropertyCommand("a", { x: 9 }));
    await manager.rollbackTransaction();
    expect(objects.get("a")?.x).toBe(0);
    expect(manager.canUndo).toBe(false);
  });
});
