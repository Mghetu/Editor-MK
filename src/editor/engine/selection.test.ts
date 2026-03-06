import { describe, expect, it, vi } from "vitest";
import { bindSelectionEvents } from "./selection";

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
});
