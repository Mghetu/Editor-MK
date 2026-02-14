export type ExportFormat = "png" | "jpg";

export type PageModel = {
  id: string;
  name: string;
  fabricJson: unknown;
  thumbnail?: string;
};

export type DocModel = {
  version: 1;
  title: string;
  canvas: { width: number; height: number; background: string };
  pages: PageModel[];
  activePageId: string;
  export: { format: ExportFormat; multiplier: number };
  fonts: { families: string[] };
};

export const createBlankPage = (id: string, name = "Page 1"): PageModel => ({
  id,
  name,
  fabricJson: { version: "6", objects: [] }
});

export const createBlankDoc = (): DocModel => {
  const page = createBlankPage(crypto.randomUUID());
  return {
    version: 1,
    title: "Untitled",
    canvas: { width: 1080, height: 1080, background: "#ffffff" },
    pages: [page],
    activePageId: page.id,
    export: { format: "png", multiplier: 1 },
    fonts: { families: ["Inter"] }
  };
};
