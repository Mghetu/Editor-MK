import { Canvas } from "fabric";

export const createCanvas = (el: HTMLCanvasElement, width: number, height: number, background: string) => {
  const canvas = new Canvas(el, {
    preserveObjectStacking: true,
    selection: true,
    backgroundColor: background,
    width,
    height
  });
  return canvas;
};
