import { useEffect, useRef } from "react";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import HistoryManager from "./engine/history/history";
import { useEditorStore } from "./state/useEditorStore";
import { saveCanvasJson } from "./engine/serialize";

export type StageApi = { canvas: any; history: HistoryManager };

const AUTOSAVE_DEBOUNCE_MS = 350;

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapperEl = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const autosaveTimer = useRef<number>();
  const { doc, setSelection, updateDoc } = useEditorStore();

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = createCanvas(canvasEl.current, doc.canvas.width, doc.canvas.height, doc.canvas.background);
    const history = new HistoryManager(canvas);
    canvasRef.current = canvas;
    historyRef.current = history;

    history.bind();
    history.capture();

    const unbindSelection = bindSelectionEvents(canvas, setSelection);

    const queueSave = () => {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;
        const pageId = useEditorStore.getState().doc.activePageId;
        const json = saveCanvasJson(currentCanvas);
        updateDoc((state) => ({
          ...state,
          pages: state.pages.map((page) => (page.id === pageId ? { ...page, fabricJson: json } : page))
        }));
      }, AUTOSAVE_DEBOUNCE_MS);
    };

    canvas.on("object:added", queueSave);
    canvas.on("object:removed", queueSave);
    canvas.on("object:modified", queueSave);
    canvas.on("text:editing:exited", queueSave);

    onReady({ canvas, history });

    return () => {
      unbindSelection?.();
      history.unbind();
      canvas.off("object:added", queueSave);
      canvas.off("object:removed", queueSave);
      canvas.off("object:modified", queueSave);
      canvas.off("text:editing:exited", queueSave);
      window.clearTimeout(autosaveTimer.current);
      canvasRef.current = null;
      historyRef.current = null;
      void canvas.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const history = historyRef.current;
    const active = doc.pages.find((p) => p.id === doc.activePageId);
    if (!canvas || !history || !active) return;
    void history.loadSnapshot(active.fabricJson, { capture: true });
  }, [doc.activePageId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setWidth(doc.canvas.width);
    canvas.setHeight(doc.canvas.height);
    canvas.backgroundColor = doc.canvas.background;
    canvas.renderAll();
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

  return (
    <div ref={wrapperEl} className="h-full w-full overflow-auto bg-slate-200 p-6">
      <canvas ref={canvasEl} className="shadow-2xl" />
    </div>
  );
}
