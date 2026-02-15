import { FabricObject } from "fabric";

export const HANDLE_STYLE = {
  cornerColor: "#ffffff",
  cornerStrokeColor: "#3b82f6",
  cornerStyle: "circle",
  cornerSize: 12,
  transparentCorners: false,
  borderColor: "#3b82f6",
  borderScaleFactor: 1.5,
  borderOpacityWhenMoving: 1,
  padding: 0
} as const;

export const applyGlobalHandleStyle = () => {
  FabricObject.prototype.set(HANDLE_STYLE as any);
};

export const applyObjectHandleStyle = (obj: any) => {
  if (!obj || obj?.data?.type === "crop-frame") return;
  obj.set(HANDLE_STYLE as any);
};
