export const presets = {
  p400: { w: 400, h: 400 },
  p600x300: { w: 600, h: 300 },
  p350x200: { w: 350, h: 200 }
};

export type FrameBounds = { left: number; top: number; width: number; height: number };

export const getFrameBounds = (frame: any): FrameBounds => {
  if (typeof frame?.getBoundingRect === "function") {
    const b = frame.getBoundingRect(true, true);
    return {
      left: b.left ?? 0,
      top: b.top ?? 0,
      width: Math.max(1, b.width ?? 1),
      height: Math.max(1, b.height ?? 1)
    };
  }

  return {
    left: frame.left ?? 0,
    top: frame.top ?? 0,
    width: Math.max(1, (frame.width ?? 1) * (frame.scaleX ?? 1)),
    height: Math.max(1, (frame.height ?? 1) * (frame.scaleY ?? 1))
  };
};

export const clampImageToFrame = (image: any, frame: any) => {
  const { left, top, width, height } = getFrameBounds(frame);
  const imgW = Math.max(1, image.getScaledWidth?.() ?? 1);
  const imgH = Math.max(1, image.getScaledHeight?.() ?? 1);
  const imgLeft = image.left ?? 0;
  const imgTop = image.top ?? 0;

  const minLeft = left + width - imgW;
  const maxLeft = left;
  const minTop = top + height - imgH;
  const maxTop = top;

  image.set({
    left: Math.min(maxLeft, Math.max(minLeft, imgLeft)),
    top: Math.min(maxTop, Math.max(minTop, imgTop))
  });
};

export const ensureFrameVisibleByExpandingCanvas = (frame: any, canvas: any) => {
  const b = getFrameBounds(frame);
  const nextW = Math.max(canvas.getWidth?.() ?? 0, Math.ceil(b.left + b.width + 24));
  const nextH = Math.max(canvas.getHeight?.() ?? 0, Math.ceil(b.top + b.height + 24));
  if (nextW !== canvas.getWidth?.() || nextH !== canvas.getHeight?.()) {
    canvas.setWidth(nextW);
    canvas.setHeight(nextH);
  }
};
