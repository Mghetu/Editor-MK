import { describe, expect, it } from "vitest";
import HistoryManager from "./history";

const makeCanvas = () => {
  const listeners = new Map<string, ((evt?: any) => void)[]>();
  const objects: any[] = [];
  let active: any;

  const canvas: any = {
    on: (event: string, handler: (evt?: any) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), handler]);
    },
    off: (event: string, handler: (evt?: any) => void) => {
      listeners.set(event, (listeners.get(event) ?? []).filter((h) => h !== handler));
    },
    getObjects: () => objects,
    getActiveObject: () => active,
    setActiveObject: (obj: any) => {
      active = obj;
    },
    fire: () => {},
    clear: () => {
      objects.splice(0, objects.length);
      active = undefined;
    },
    loadFromJSON: async (json: any) => {
      objects.splice(0, objects.length, ...((json?.objects ?? []).map((obj: any) => ({ ...obj, set(values: Record<string, unknown>) { Object.assign(this, values); } }))));
    },
    renderAll: () => {},
    requestRenderAll: () => {},
    toJSON: () => ({ objects: objects.map((o) => ({ ...o })) })
  };

  return { canvas, objects, setActive: (obj: any) => { active = obj; } };
};

describe("HistoryManager selection restore", () => {
  it("restores selection by object type fallback when selectedObjectId is missing", async () => {
    const { canvas, objects, setActive } = makeCanvas();
    const manager = new HistoryManager(canvas);

    const grid = {
      id: undefined,
      type: "group",
      data: {},
      _objects: [{ data: { role: "slot" } }]
    };

    objects.push(grid);
    setActive(grid);

    manager.capture({ action: "snapshot", coalesce: false });

    // simulate snapshot reload where id is missing but grid structure remains
    await manager.loadSnapshot({ objects: [grid] }, { selectedObjectType: "imageGrid" });

    expect(canvas.getActiveObject()).toBeTruthy();
    expect(canvas.getActiveObject().type).toBe("group");
  });
});
