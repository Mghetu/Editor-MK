import { ChevronDown, ChevronLeft, ChevronRight, Download, MousePointerClick, Redo2, Undo2, Upload } from "lucide-react";
import { exportCurrentPage } from "../engine/export/exportPage";
import { exportAllPagesZip } from "../engine/export/exportZip";
import { loadCanvasJson, saveCanvasJson } from "../engine/serialize";
import { setActivePageByNumber, setActivePageByOffset } from "../features/pages/pagesController";
import { useEditorStore } from "../state/useEditorStore";

export function TopBar({ undo, redo, persistNow }: { undo: () => void; redo: () => void; persistNow?: () => void }) {
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
    <div className="flex h-14 items-center gap-2 border-b border-[#313131] bg-[#1f1f1f] px-4 text-slate-200">
      <div className="text-sm font-semibold text-slate-100">Editor MK</div>
      <label className="cursor-pointer rounded px-3 py-1.5 text-sm hover:bg-[#2a2a2a]">
        File <ChevronDown size={14} className="ml-1 inline" />
        <input type="file" accept="application/json" className="hidden" onChange={(e) => openJson(e.target.files?.[0])} />
      </label>
      <button className="rounded p-2 hover:bg-[#2a2a2a]" title="Import JSON" onClick={() => document.querySelector<HTMLInputElement>('input[type=file][accept="application/json"]')?.click()}>
        <Upload size={16} />
      </button>
      <button className="rounded border border-[#454545] bg-[#2b2b2b] px-2 py-1 text-xs text-slate-200" onClick={saveJson}>Save JSON</button>
      <button className={`rounded p-2 hover:bg-[#2a2a2a] ${activeTab === "select" ? "bg-[#353535] text-violet-300" : ""}`} onClick={() => setTab("select")} title="Select tool">
        <MousePointerClick size={16} />
      </button>

      <div className="mx-1 h-6 w-px bg-[#3a3a3a]" />

      <button className="rounded p-2 hover:bg-[#2a2a2a]" onClick={undo} title="Undo"><Undo2 size={16} /></button>
      <button className="rounded p-2 hover:bg-[#2a2a2a]" onClick={redo} title="Redo"><Redo2 size={16} /></button>

      <div className="ml-2 flex items-center gap-1 rounded border border-[#454545] bg-[#2b2b2b] px-1 py-0.5 text-xs">
        <button
          className="rounded p-1 hover:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => updateDoc((d) => setActivePageByOffset(d, -1))}
          disabled={activeIndex === 0}
          title="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-1 text-slate-200">Page</span>
        <input
          className="w-10 rounded border border-[#5a5a5a] bg-[#202020] px-1 py-0.5 text-center text-slate-200"
          value={activeIndex + 1}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (!Number.isFinite(parsed) || parsed < 1) return;
            updateDoc((d) => setActivePageByNumber(d, parsed));
          }}
        />
        <span className="text-slate-400">/ {doc.pages.length}</span>
        <button
          className="rounded p-1 hover:bg-[#3d3d3d] disabled:cursor-not-allowed disabled:opacity-40"
          onClick={() => updateDoc((d) => setActivePageByOffset(d, 1))}
          disabled={activeIndex >= doc.pages.length - 1}
          title="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 text-sm">
        <button className={`rounded border border-[#5a5a5a] px-2 py-1 ${doc.export.format === "png" ? "bg-violet-600 text-white" : "bg-[#2b2b2b] text-slate-200"}`} onClick={() => setExportFormat("png")}>PNG</button>
        <button className={`rounded border border-[#5a5a5a] px-2 py-1 ${doc.export.format === "jpg" ? "bg-violet-600 text-white" : "bg-[#2b2b2b] text-slate-200"}`} onClick={() => setExportFormat("jpg")}>JPG</button>
        <button
          className="rounded bg-violet-600 px-3 py-1 text-white hover:bg-violet-500"
          onClick={() => exportCurrentPage((window as any).__editorCanvas, doc.export.format, doc.export.multiplier, doc.pages.find((p) => p.id === doc.activePageId)?.name || "page")}
        >
          <Download size={14} className="mr-1 inline" /> Export
        </button>
        <button
          className="rounded bg-fuchsia-600 px-3 py-1 text-white hover:bg-fuchsia-500"
          onClick={() => {
            persistNow?.();
            const latestDoc = useEditorStore.getState().doc;
            exportAllPagesZip((window as any).__editorCanvas, latestDoc);
          }}
        >
          Export ZIP
        </button>
      </div>
    </div>
  );
}
