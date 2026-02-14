import { useEffect, useRef } from "react";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import { HistoryManager } from "./engine/history/history";
import { useEditorStore } from "./state/useEditorStore";
import { loadCanvasJson, saveCanvasJson } from "./engine/serialize";

export type StageApi = { canvas: any; history: HistoryManager };

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapperEl = useRef<HTMLDivElement>(null);
  const { doc, setSelection, updateDoc } = useEditorStore();

  useEffect(() => {
    if (!canvasEl.current) return;
    const canvas = createCanvas(canvasEl.current, doc.canvas.width, doc.canvas.height, doc.canvas.background);
    const history = new HistoryManager(canvas);
    history.bind();
    history.capture();
    bindSelectionEvents(canvas, setSelection);
    onReady({ canvas, history });
    return () => { void canvas.dispose(); };
  }, []);

  useEffect(() => {
    const active = doc.pages.find((p) => p.id === doc.activePageId);
    if (!active || !(window as any).__editorCanvas) return;
    loadCanvasJson((window as any).__editorCanvas, active.fabricJson);
  }, [doc.activePageId]);

  useEffect(() => {
    const handle = () => {
      const c = (window as any).__editorCanvas;
      if (!c) return;
      const pageId = useEditorStore.getState().doc.activePageId;
      updateDoc((d) => ({
        ...d,
        pages: d.pages.map((p) => (p.id === pageId ? { ...p, fabricJson: saveCanvasJson(c) } : p))
      }));
    };
    const t = window.setInterval(handle, 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={wrapperEl} className="h-full w-full overflow-auto bg-slate-200 p-6">
      <canvas ref={canvasEl} className="shadow-2xl" />
    </div>
  );
}
