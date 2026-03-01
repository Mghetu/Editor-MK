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
    const res = await fetch(new URL(jsonUrl.replace(/^\//, ""), import.meta.env.BASE_URL).toString());
    const json = await res.json();
    updateDoc((doc) => ({ ...doc, canvas: { ...doc.canvas, width: w, height: h }, pages: [{ ...doc.pages[0], fabricJson: json }], activePageId: doc.pages[0].id }));
    await loadCanvasJson((window as any).__editorCanvas, json);
  };

  return (
    <div className="space-y-2 rounded-xl border border-[#3f3f3f] bg-[#1f1f1f] p-3">
      <h3 className="mb-2 font-semibold text-slate-100">Templates</h3>
      <div className="space-y-2">
        {manifest?.templates.map((t) => (
          <button key={t.id} className="w-full rounded border border-[#555] bg-[#252525] p-2 text-left text-slate-100 hover:bg-[#333]" onClick={() => apply(t.json, t.size.w, t.size.h)}>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}
