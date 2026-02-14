export const presets = {
  p400: { w: 400, h: 400 },
  p600x300: { w: 600, h: 300 },
  p350x200: { w: 350, h: 200 }
};

export type FrameBounds = { left: number; top: number; width: number; height: number };

export const getFrameBounds = (frame: any): FrameBounds => ({
  left: frame.left ?? 0,
  top: frame.top ?? 0,
  width: Math.max(1, (frame.width ?? 1) * (frame.scaleX ?? 1)),
  height: Math.max(1, (frame.height ?? 1) * (frame.scaleY ?? 1))
});

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

export const fitFrameInsideCanvas = (frame: any, canvas: any) => {
  const maxW = canvas.getWidth?.() ?? 0;
  const maxH = canvas.getHeight?.() ?? 0;
  const { left, top, width, height } = getFrameBounds(frame);
  frame.set({
    left: Math.max(0, Math.min(left, maxW - width)),
    top: Math.max(0, Math.min(top, maxH - height))
  });
};
