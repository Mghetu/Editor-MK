import { Canvas, FabricObject } from "fabric";

const applyGlobalHandleStyle = () => {
  FabricObject.prototype.set({
    cornerColor: "#FFFFFF",
    cornerStyle: "circle",
    borderColor: "#3b82f6",
    borderScaleFactor: 1.5,
    transparentCorners: false,
    borderOpacityWhenMoving: 1,
    cornerStrokeColor: "#3b82f6",
    cornerSize: 10,
    padding: 2
  } as any);
};

export const createCanvas = (el: HTMLCanvasElement, width: number, height: number, background: string) => {
  applyGlobalHandleStyle();

  const canvas = new Canvas(el, {
    preserveObjectStacking: true,
    controlsAboveOverlay: true,
    selection: true,
    backgroundColor: background,
    width,
    height
  });

  return canvas;
};
