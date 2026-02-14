import { useEffect, useState } from "react";
import { loadTemplateManifest, type TemplateManifest } from "../../features/templates/manifest";
import { useEditorStore } from "../../state/useEditorStore";
import { loadCanvasJson } from "../../engine/serialize";

export function TemplatesPanel() {
  const [manifest, setManifest] = useState<TemplateManifest | null>(null);
  const { updateDoc } = useEditorStore();

  useEffect(() => {
    loadTemplateManifest().then(setManifest).catch(() => setManifest(null));
  }, []);

  const apply = async (jsonUrl: string, w: number, h: number) => {
    const res = await fetch(`/Editor-MK${jsonUrl}`.replace("/Editor-MK/Editor-MK", "/Editor-MK"));
    const json = await res.json();
    updateDoc((doc) => ({ ...doc, canvas: { ...doc.canvas, width: w, height: h }, pages: [{ ...doc.pages[0], fabricJson: json }], activePageId: doc.pages[0].id }));
    await loadCanvasJson((window as any).__editorCanvas, json);
  };

  return (
    <div>
      <h3 className="mb-2 font-semibold">Templates</h3>
      <div className="space-y-2">
        {manifest?.templates.map((t) => (
          <button key={t.id} className="w-full rounded border p-2 text-left" onClick={() => apply(t.json, t.size.w, t.size.h)}>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
