import { describe, expect, it } from "vitest";
import { setRectRadiusPxPreserveSize, setRectCornerRadiiPx, normalizeRectAfterTransform } from "./shapeGeometry";

const createRect = () => ({
  data: { type: "shape", shapeKind: "rect", id: "shape-1" },
  width: 200,
  height: 120,
  scaleX: 1,
  scaleY: 1,
  rx: 0,
  ry: 0,
  dirty: false,
  strokeUniform: true,
  group: { dirty: false },
  getScaledWidth() {
    return this.width * Math.abs(this.scaleX);
  },
  getScaledHeight() {
    return this.height * Math.abs(this.scaleY);
  }
});

describe("shape geometry dirty invalidation", () => {
  it("marks rectangle dirty when updating all corner radii", () => {
    const rect = createRect();
    setRectRadiusPxPreserveSize(rect, 10);
    expect(rect.rx).toBe(10);
    expect(rect.ry).toBe(10);
    expect(rect.dirty).toBe(true);
    expect(rect.group.dirty).toBe(true);
  });

  it("marks rectangle dirty for per-corner radius updates and normalize", () => {
    const rect = createRect();
    setRectCornerRadiiPx(rect, { tl: 8, tr: 6, br: 4, bl: 2 });
    expect(rect.dirty).toBe(true);

    rect.dirty = false;
    rect.group.dirty = false;
    normalizeRectAfterTransform(rect);
    expect(rect.dirty).toBe(true);
    expect(rect.group.dirty).toBe(true);
  });
});
