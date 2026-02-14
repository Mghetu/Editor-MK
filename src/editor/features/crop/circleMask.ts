import { Circle } from "fabric";

export const makeCircleClip = (left: number, top: number, w: number, h: number) => {
  const radius = Math.min(w, h) / 2;
  const clip = new Circle({ radius, left: left + w / 2 - radius, top: top + h / 2 - radius });
  clip.absolutePositioned = true;
  return clip;
};
