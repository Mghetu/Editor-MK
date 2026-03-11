import { describe, expect, it, vi, afterEach } from "vitest";
import { applyObjectMutation } from "./mutator";

describe("applyObjectMutation", () => {
  afterEach(() => {
    delete (globalThis as any).window;
  });

  it("marks object dirty and requests render without command history", async () => {
    const requestRenderAll = vi.fn();
    const obj: any = {
      data: { id: "a" },
      dirty: false,
      group: { dirty: false },
      setCoords: vi.fn()
    };
    const canvas: any = { requestRenderAll };

    (globalThis as any).window = {};

    await applyObjectMutation(
      canvas,
      obj,
      (target) => {
        target.fill = "#ff0000";
      },
      "Set fill color"
    );

    expect(obj.dirty).toBe(true);
    expect(obj.group.dirty).toBe(true);
    expect(obj.setCoords).toHaveBeenCalled();
    expect(requestRenderAll).toHaveBeenCalled();
  });

  it("marks object dirty and requests render with command history enabled", async () => {
    const requestRenderAll = vi.fn();
    const execute = vi.fn(async () => {});
    const obj: any = {
      data: { id: "a" },
      dirty: false,
      group: { dirty: false },
      setCoords: vi.fn(),
      toObject: () => ({ data: { id: "a" }, fill: "#00ff00" })
    };
    const canvas: any = {
      requestRenderAll,
      getObjects: () => [obj]
    };

    (globalThis as any).window = { __commandHistory: { execute } };

    await applyObjectMutation(
      canvas,
      obj,
      (target) => {
        target.fill = "#00ff00";
      },
      "Set fill color"
    );

    expect(obj.dirty).toBe(true);
    expect(obj.group.dirty).toBe(true);
    expect(obj.setCoords).toHaveBeenCalled();
    expect(requestRenderAll).toHaveBeenCalled();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
