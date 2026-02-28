export type CropState = {
  enabled: boolean;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  aspect: number | null;
};

export type RectBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type CropPreset = {
  label: string;
  aspect: number | null;
};
