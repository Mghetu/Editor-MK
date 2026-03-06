import { describe, expect, it } from "vitest";
import { AddObjectCommand, ApplyCropCommand, BatchSetPropertyCommand, RemoveObjectCommand, ReorderObjectCommand, ReplaceObjectStateCommand } from "./commands/basic";
import { CommandHistoryManager } from "./transactionHistory";
import type { HistoryContext } from "./commands/types";

const withObjectRuntime = (obj: Record<string, unknown>) => ({
  ...obj,
  set(values: Record<string, unknown>) {
    Object.assign(this, values);
  },
  get(key: string) {
    return (this as any)[key];
  },
  setCoords() {}
});

const createMockContext = () => {
  const ordered: any[] = [];
  const objects = new Map<string, any>();
  const add = (obj: any) => {
    objects.set(String(obj.id), obj);
    ordered.push(obj);
  };
  add(withObjectRuntime({ id: "a", data: { id: "a" }, x: 0 }));

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
    enlivenObject: async (serialized) => withObjectRuntime(serialized),
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

  it("supports optimistic replace commands without re-applying on initial execute", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    objects.set("a", withObjectRuntime({ id: "a", data: { id: "a" }, x: 22 }));

    await manager.execute(
      new ReplaceObjectStateCommand("a", { id: "a", x: 0, data: { id: "a" } }, { id: "a", x: 22, data: { id: "a" } }, { alreadyApplied: true }),
      { source: "ui" }
    );

    expect(objects.get("a")?.x).toBe(22);
    await manager.undo();
    expect(objects.get("a")?.x).toBe(0);
    await manager.redo();
    expect(objects.get("a")?.x).toBe(22);
  });

  it("applies and reverts crop state changes", async () => {
    const { ctx, objects, ordered } = createMockContext();
    const img = withObjectRuntime({
      id: "img",
      left: 0,
      top: 0,
      width: 200,
      height: 120,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    });
    objects.set("img", img);
    ordered.push(img);

    const manager = new CommandHistoryManager(ctx);
    await manager.execute(
      new ApplyCropCommand(
        "img",
        { left: 0, top: 0, width: 200, height: 120, cropX: 0, cropY: 0, cropState: null, __cropState: null },
        { left: 20, top: 10, width: 80, height: 60, cropX: 20, cropY: 10, cropState: { enabled: true }, __cropState: { enabled: true } }
      )
    );
    expect(objects.get("img")?.width).toBe(80);
    expect(objects.get("img")?.cropX).toBe(20);
    await manager.undo();
    expect(objects.get("img")?.width).toBe(200);
    expect(objects.get("img")?.cropX).toBe(0);
  });

  it("reorders layer and restores on undo", async () => {
    const { ctx, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);
    ordered.push(withObjectRuntime({ id: "b" }), withObjectRuntime({ id: "c" }));

    await manager.execute(new ReorderObjectCommand("a", 0, 2));
    expect(ordered.map((obj) => obj.id)).toEqual(["b", "c", "a"]);
    await manager.undo();
    expect(ordered.map((obj) => obj.id)).toEqual(["a", "b", "c"]);
  });



  it("replays add/remove object commands across undo and redo", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    await manager.execute(new AddObjectCommand({ id: "b", data: { id: "b", type: "shape" }, x: 1 }));
    expect(objects.get("b")?.x).toBe(1);

    await manager.execute(new RemoveObjectCommand("a", { id: "a", data: { id: "a" }, x: 0 }));
    expect(objects.get("a")).toBeFalsy();

    await manager.undo();
    expect(objects.get("a")?.x).toBe(0);
    await manager.undo();
    expect(objects.get("b")).toBeFalsy();

    await manager.redo();
    expect(objects.get("b")?.x).toBe(1);
    await manager.redo();
    expect(objects.get("a")).toBeFalsy();
  });

  it("handles multi-object edit/add and undo-redo replay", async () => {
    const { ctx, objects } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    await manager.execute(new AddObjectCommand({ id: "b", data: { id: "b", type: "shape" }, x: 0 }));
    await manager.execute(new AddObjectCommand({ id: "c", data: { id: "c", type: "shape" }, x: 0 }));
    await manager.execute(new AddObjectCommand({ id: "d", data: { id: "d", type: "shape" }, x: 0 }));
    await manager.execute(new AddObjectCommand({ id: "img", data: { id: "img", type: "image" }, x: 0 }));

    await manager.execute(new BatchSetPropertyCommand("a", { x: 10 }));
    await manager.execute(new BatchSetPropertyCommand("b", { x: 20 }));
    await manager.execute(new BatchSetPropertyCommand("img", { x: 30 }));

    expect(objects.get("img")?.x).toBe(30);
    expect(objects.get("d")).toBeTruthy();

    await manager.undo();
    await manager.undo();
    await manager.undo();
    await manager.undo();

    expect(objects.get("img")).toBeFalsy();
    expect(objects.get("a")?.x).toBe(0);
    expect(objects.get("b")?.x).toBe(0);

    await manager.redo();
    await manager.redo();
    await manager.redo();
    await manager.redo();

    expect(objects.get("img")?.x).toBe(30);
    expect(objects.get("a")?.x).toBe(10);
    expect(objects.get("b")?.x).toBe(20);
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

  it("replays interleaved crop, reorder, and edits across undo/redo", async () => {
    const { ctx, objects, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    const img = withObjectRuntime({
      id: "img",
      data: { id: "img", type: "image" },
      left: 0,
      top: 0,
      width: 200,
      height: 120,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null,
      x: 0
    });

    objects.set("img", img);
    ordered.push(img);

    await manager.execute(
      new ApplyCropCommand(
        "img",
        { left: 0, top: 0, width: 200, height: 120, cropX: 0, cropY: 0, cropState: null, __cropState: null },
        { left: 10, top: 5, width: 100, height: 60, cropX: 10, cropY: 5, cropState: { enabled: true }, __cropState: { enabled: true } }
      )
    );

    await manager.execute(new ReorderObjectCommand("img", 1, 0));
    await manager.execute(new BatchSetPropertyCommand("a", { x: 44 }));

    expect(objects.get("img")?.width).toBe(100);
    expect(ordered.map((obj) => obj.id)).toEqual(["img", "a"]);
    expect(objects.get("a")?.x).toBe(44);

    await manager.undo();
    await manager.undo();
    await manager.undo();

    expect(objects.get("a")?.x).toBe(0);
    expect(ordered.map((obj) => obj.id)).toEqual(["a", "img"]);
    expect(objects.get("img")?.width).toBe(200);
    expect(objects.get("img")?.cropX).toBe(0);

    await manager.redo();
    await manager.redo();
    await manager.redo();

    expect(objects.get("img")?.width).toBe(100);
    expect(objects.get("img")?.cropX).toBe(10);
    expect(ordered.map((obj) => obj.id)).toEqual(["img", "a"]);
    expect(objects.get("a")?.x).toBe(44);
  });



  it("simulates crop apply then restore with interleaved add/remove/reorder replay", async () => {
    const { ctx, objects, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    const img = withObjectRuntime({
      id: "img2",
      data: { id: "img2", type: "image" },
      left: 0,
      top: 0,
      width: 300,
      height: 180,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    });
    objects.set("img2", img);
    ordered.push(img);

    await manager.execute(
      new ApplyCropCommand(
        "img2",
        { left: 0, top: 0, width: 300, height: 180, cropX: 0, cropY: 0, cropState: null, __cropState: null },
        { left: 15, top: 10, width: 140, height: 90, cropX: 15, cropY: 10, cropState: { enabled: true }, __cropState: { enabled: true } }
      )
    );

    await manager.execute(new AddObjectCommand({ id: "tmp", data: { id: "tmp", type: "shape" }, x: 5 }));
    await manager.execute(new ReorderObjectCommand("img2", 1, 0));
    await manager.execute(new RemoveObjectCommand("tmp", { id: "tmp", data: { id: "tmp", type: "shape" }, x: 5 }));

    expect(objects.get("img2")?.width).toBe(140);
    expect(ordered.map((obj) => obj.id)).toContain("img2");
    expect(objects.get("tmp")).toBeFalsy();

    // Undo remove first (tmp returns), then remaining steps
    await manager.undo();
    expect(objects.get("tmp")?.x).toBe(5);
    await manager.undo();
    await manager.undo();
    await manager.undo();

    expect(objects.get("tmp")).toBeFalsy();
    expect(ordered.map((obj) => obj.id)[0]).toBe("a");
    expect(objects.get("img2")?.width).toBe(300);
    expect(objects.get("img2")?.cropX).toBe(0);

    await manager.redo();
    await manager.redo();
    await manager.redo();
    await manager.redo();

    expect(objects.get("img2")?.width).toBe(140);
    expect(objects.get("img2")?.cropX).toBe(15);
    expect(objects.get("tmp")).toBeFalsy();
  });





  it("simulates crop apply then cancel-style restoration with interleaved edits", async () => {
    const { ctx, objects, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    const img = withObjectRuntime({
      id: "img4",
      data: { id: "img4", type: "image" },
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    });
    objects.set("img4", img);
    ordered.push(img);

    const beforeCrop = {
      left: 0,
      top: 0,
      width: 320,
      height: 200,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    };

    const afterCrop = {
      left: 25,
      top: 15,
      width: 160,
      height: 100,
      cropX: 25,
      cropY: 15,
      cropState: { enabled: true, aspect: 16 / 10 },
      __cropState: { enabled: true, aspect: 16 / 10 }
    };

    // Crop apply + unrelated edits.
    await manager.execute(new ApplyCropCommand("img4", beforeCrop, afterCrop));
    await manager.execute(new BatchSetPropertyCommand("a", { x: 33 }));
    await manager.execute(new ReorderObjectCommand("img4", 1, 0));

    expect(objects.get("img4")?.width).toBe(160);
    expect(objects.get("img4")?.cropX).toBe(25);
    expect(objects.get("a")?.x).toBe(33);
    expect(ordered.map((o) => o.id)[0]).toBe("img4");

    // Simulate crop cancel semantics by applying inverse crop command.
    await manager.execute(new ApplyCropCommand("img4", afterCrop, beforeCrop));
    expect(objects.get("img4")?.width).toBe(320);
    expect(objects.get("img4")?.cropX).toBe(0);

    // Undo cancel -> returns to cropped state.
    await manager.undo();
    expect(objects.get("img4")?.width).toBe(160);
    expect(objects.get("img4")?.cropX).toBe(25);

    // Undo prior edits + apply.
    await manager.undo();
    await manager.undo();
    await manager.undo();

    expect(objects.get("a")?.x).toBe(0);
    expect(ordered.map((o) => o.id)[0]).toBe("a");
    expect(objects.get("img4")?.width).toBe(320);
    expect(objects.get("img4")?.cropX).toBe(0);

    // Redo full chain restores cancel-state result.
    await manager.redo();
    await manager.redo();
    await manager.redo();
    await manager.redo();

    expect(objects.get("a")?.x).toBe(33);
    expect(ordered.map((o) => o.id)[0]).toBe("img4");
    expect(objects.get("img4")?.width).toBe(320);
    expect(objects.get("img4")?.cropX).toBe(0);
  });

  it("rolls back mixed in-flight transaction atomically", async () => {
    const { ctx, objects, ordered } = createMockContext();
    const manager = new CommandHistoryManager(ctx);

    const img = withObjectRuntime({
      id: "img3",
      data: { id: "img3", type: "image" },
      left: 0,
      top: 0,
      width: 240,
      height: 160,
      cropX: 0,
      cropY: 0,
      cropState: null,
      __cropState: null
    });
    objects.set("img3", img);
    ordered.push(img);

    manager.beginTransaction("Mixed edit", { source: "ui" });
    await manager.execute(
      new ApplyCropCommand(
        "img3",
        { left: 0, top: 0, width: 240, height: 160, cropX: 0, cropY: 0, cropState: null, __cropState: null },
        { left: 20, top: 10, width: 120, height: 80, cropX: 20, cropY: 10, cropState: { enabled: true }, __cropState: { enabled: true } }
      )
    );
    await manager.execute(new ReorderObjectCommand("img3", 1, 0));
    await manager.execute(new BatchSetPropertyCommand("a", { x: 88 }));

    expect(objects.get("img3")?.width).toBe(120);
    expect(ordered.map((obj) => obj.id)[0]).toBe("img3");
    expect(objects.get("a")?.x).toBe(88);

    await manager.rollbackTransaction();

    expect(objects.get("img3")?.width).toBe(240);
    expect(objects.get("img3")?.cropX).toBe(0);
    expect(ordered.map((obj) => obj.id)[0]).toBe("a");
    expect(objects.get("a")?.x).toBe(0);
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
