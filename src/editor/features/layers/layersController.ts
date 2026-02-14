import type { Canvas } from "fabric";

export const bringForward = (canvas: Canvas) => {
  const obj = canvas.getActiveObject();
  if (obj) canvas.bringObjectForward(obj);
};

export const sendBackward = (canvas: Canvas) => {
  const obj = canvas.getActiveObject();
  if (obj) canvas.sendObjectBackwards(obj);
};
