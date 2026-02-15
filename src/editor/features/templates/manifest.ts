export type TemplateManifest = {
  version: number;
  templates: Array<{ id: string; name: string; size: { w: number; h: number }; preview: string; json: string; pages: number }>;
};

export const loadTemplateManifest = async () => {
  const res = await fetch(new URL("templates/manifest.json", import.meta.env.BASE_URL).toString());
  return (await res.json()) as TemplateManifest;
};
