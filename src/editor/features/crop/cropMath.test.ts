import { describe, expect, it } from "vitest";
import { canvasCropRectToSourceParams, clampRectWithinBounds, fitRectToAspectWithinBounds, sourceParamsToCanvasCropRect } from "./cropMath";

describe("cropMath", () => {
  const imageMock = {
    left: 100,
    top: 50,
    width: 800,
    height: 600,
    scaleX: 0.5,
    scaleY: 0.5,
    getElement: () => ({ naturalWidth: 800, naturalHeight: 600 }),
    getBoundingRect: () => ({ left: 100, top: 50, width: 400, height: 300 })
  };

  it("clamps crop rect inside image display bounds", () => {
    const clamped = clampRectWithinBounds(
      { left: 50, top: 20, width: 700, height: 500 },
      { left: 100, top: 50, width: 400, height: 300 }
    );

    expect(clamped).toEqual({ left: 100, top: 50, width: 400, height: 300 });
  });

  it("fits centered rect to target aspect", () => {
    const rect = fitRectToAspectWithinBounds({ left: 100, top: 50, width: 400, height: 300 }, 16 / 9);
    expect(Math.round(rect.width)).toBe(400);
    expect(Math.round(rect.height)).toBe(225);
    expect(Math.round(rect.left)).toBe(100);
    expect(Math.round(rect.top)).toBe(88);
  });

  it("converts canvas rect to source crop params and back", () => {
    const sourceCrop = canvasCropRectToSourceParams(imageMock, {
      left: 200,
      top: 125,
      width: 200,
      height: 150
    });

    expect(Math.round(sourceCrop.cropX)).toBe(200);
    expect(Math.round(sourceCrop.cropY)).toBe(150);
    expect(Math.round(sourceCrop.cropW)).toBe(400);
    expect(Math.round(sourceCrop.cropH)).toBe(300);

    const canvasRect = sourceParamsToCanvasCropRect(imageMock, sourceCrop);
    expect(Math.round(canvasRect.left)).toBe(200);
    expect(Math.round(canvasRect.top)).toBe(125);
    expect(Math.round(canvasRect.width)).toBe(200);
    expect(Math.round(canvasRect.height)).toBe(150);
  });
});
