import { ChevronDown, ChevronLeft, ChevronRight, Download, MousePointerClick, Redo2, Undo2, Upload } from "lucide-react";
import { exportCurrentPage } from "../engine/export/exportPage";
import { exportAllPagesZip } from "../engine/export/exportZip";
import { loadCanvasJson, saveCanvasJson } from "../engine/serialize";
import { setActivePageByNumber, setActivePageByOffset } from "../features/pages/pagesController";
import { useEditorStore } from "../state/useEditorStore";

export function TopBar({ undo, redo }: { undo: () => void; redo: () => void }) {
  const { doc, setExportFormat, updateDoc, setTab, activeTab } = useEditorStore();
  const activeIndex = Math.max(0, doc.pages.findIndex((p) => p.id === doc.activePageId));

  const openJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        await loadCanvasJson((window as any).__editorCanvas, json);
        updateDoc((d) => ({
          ...d,
          pages: d.pages.map((p) => (p.id === d.activePageId ? { ...p, fabricJson: json } : p))
        }));
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  const saveJson = () => {
    const canvas = (window as any).__editorCanvas;
    if (!canvas) return;
    const json = saveCanvasJson(canvas);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${doc.title || "project"}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex h-14 items-center gap-2 border-b bg-white px-4">
      <div className="text-sm font-semibold text-slate-800">Editor MK</div>
      <label className="cursor-pointer rounded px-3 py-1.5 text-sm hover:bg-slate-100">
        File <ChevronDown size={14} className="ml-1 inline" />
        <input type="file" accept="application/json" className="hidden" onChange={(e) => openJson(e.target.files?.[0])} />
      </label>
      <button className="rounded p-2 hover:bg-slate-100" title="Import JSON" onClick={() => document.querySelector<HTMLInputElement>('input[type=file][accept="application/json"]')?.click()}>
        <Upload size={16} />
      </button>
      <button className="rounded border px-2 py-1 text-xs" onClick={saveJson}>Save JSON</button>
      <button className={`rounded p-2 hover:bg-slate-100 ${activeTab === "select" ? "bg-slate-100" : ""}`} onClick={() => setTab("select")} title="Select tool">
        <MousePointerClick size={16} />
      </button>

      <div className="mx-1 h-6 w-px bg-slate-200" />

      <button className="rounded p-2 hover:bg-slate-100" onClick={undo} title="Undo"><Undo2 size={16} /></button>
      <button className="rounded p-2 hover:bg-slate-100" onClick={redo} title="Redo"><Redo2 size={16} /></button>

      <div className="ml-2 flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs">
        <button
          className="rounded p-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => updateDoc((d) => setActivePageByOffset(d, -1))}
          disabled={activeIndex === 0}
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-1 text-slate-700">Page</span>
        <input
          className="w-10 rounded border border-slate-300 bg-white px-1 py-0.5 text-center"
          value={activeIndex + 1}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (!Number.isFinite(parsed) || parsed < 1) return;
            updateDoc((d) => setActivePageByNumber(d, parsed));
          }}
        />
        <span className="text-slate-500">/ {doc.pages.length}</span>
        <button
          className="rounded p-1 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => updateDoc((d) => setActivePageByOffset(d, 1))}
          disabled={activeIndex >= doc.pages.length - 1}
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 text-sm">
        <button className={`rounded border px-2 py-1 ${doc.export.format === "png" ? "bg-slate-900 text-white" : ""}`} onClick={() => setExportFormat("png")}>PNG</button>
        <button className={`rounded border px-2 py-1 ${doc.export.format === "jpg" ? "bg-slate-900 text-white" : ""}`} onClick={() => setExportFormat("jpg")}>JPG</button>
        <button
          className="rounded bg-sky-600 px-3 py-1 text-white"
          onClick={() => exportCurrentPage((window as any).__editorCanvas, doc.export.format, doc.export.multiplier, doc.pages.find((p) => p.id === doc.activePageId)?.name || "page")}
        >
          <Download size={14} className="mr-1 inline" /> Export
        </button>
        <button className="rounded bg-indigo-600 px-3 py-1 text-white" onClick={() => exportAllPagesZip((window as any).__editorCanvas, doc)}>
          Export ZIP
        </button>
      </div>
    </div>
  );
}
