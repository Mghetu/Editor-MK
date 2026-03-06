import { describe, expect, it, vi } from "vitest";
import { bindSelectionEvents, inferSelectionType } from "./selection";

describe("bindSelectionEvents", () => {
  it("emits selection updates even when id/type are unchanged", () => {
    const listeners = new Map<string, (evt?: any) => void>();
    const activeObj: any = {
      id: "shape-1",
      type: "rect",
      data: { id: "shape-1", type: "shape" },
      set: vi.fn()
    };

    const canvas: any = {
      getActiveObject: () => activeObj,
      getObjects: () => [activeObj],
      on: (event: string, handler: (evt?: any) => void) => listeners.set(event, handler),
      off: (event: string) => listeners.delete(event)
    };

    const onSelectionChange = vi.fn();
    const unbind = bindSelectionEvents(canvas, onSelectionChange);

    listeners.get("selection:updated")?.();
    listeners.get("selection:updated")?.();

    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenNthCalledWith(1, "shape-1", "shape");
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, "shape-1", "shape");

    unbind();
  });

  it("does not clear inspector selection on transient selection:cleared during replacement", async () => {
    const listeners = new Map<string, (evt?: any) => void>();
    const activeObj: any = {
      id: "grid-1",
      type: "group",
      data: { id: "grid-1", type: "imageGrid" },
      set: vi.fn()
    };

    const canvas: any = {
      getActiveObject: () => activeObj,
      getObjects: () => [activeObj],
      on: (event: string, handler: (evt?: any) => void) => listeners.set(event, handler),
      off: (event: string) => listeners.delete(event)
    };

    const onSelectionChange = vi.fn();
    const unbind = bindSelectionEvents(canvas, onSelectionChange);

    listeners.get("selection:updated")?.();
    listeners.get("selection:cleared")?.();
    await Promise.resolve();

    expect(onSelectionChange).toHaveBeenCalledTimes(2);
    expect(onSelectionChange).toHaveBeenNthCalledWith(1, "grid-1", "imageGrid");
    expect(onSelectionChange).toHaveBeenNthCalledWith(2, "grid-1", "imageGrid");

    unbind();
  });
});


describe("inferSelectionType", () => {
  it("infers imageGrid for group objects with grid slot data", () => {
    expect(inferSelectionType({ type: "group", data: { slots: [{ id: "s1" }], frameWidth: 300, frameHeight: 200 } })).toBe("imageGrid");
  });

  it("infers shape for rect fabric objects with generic shape data", () => {
    expect(inferSelectionType({ type: "rect", data: { type: "shape" } })).toBe("shape");
  });

  it("infers imageGrid from activeSelection wrapper with one grid group", () => {
    const grid = { type: "group", data: { id: "g1", slots: [{ id: "s1" }], frameWidth: 300, frameHeight: 200 } };
    expect(inferSelectionType({ type: "activeSelection", _objects: [grid] })).toBe("imageGrid");
  });

  it("infers imageGrid from group children roles when slots metadata is missing", () => {
    const grid = {
      type: "group",
      data: { id: "g1" },
      _objects: [
        { data: { role: "slot", slotId: "s1" } },
        { data: { role: "slot-label" } }
      ]
    };
    expect(inferSelectionType(grid)).toBe("imageGrid");
  });
});
