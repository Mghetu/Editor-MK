import { useEffect, useRef } from "react";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import HistoryManager from "./engine/history/history";
import { useEditorStore } from "./state/useEditorStore";
import { saveCanvasJson } from "./engine/serialize";

export type StageApi = { canvas: any; history: HistoryManager };

const AUTOSAVE_DEBOUNCE_MS = 350;
const PAGE_THUMBNAIL_MULTIPLIER = 0.15;

const applyCanvasDimensions = (canvas: any, width: number, height: number) => {
  if (typeof canvas?.setDimensions === "function") {
    canvas.setDimensions({ width, height });
    return;
  }

  if (typeof canvas?.setWidth === "function") canvas.setWidth(width);
  if (typeof canvas?.setHeight === "function") canvas.setHeight(height);
};

const snapshotPage = (canvas: any) => {
  const fabricJson = saveCanvasJson(canvas);
  const thumbnail =
    typeof canvas?.toDataURL === "function"
      ? canvas.toDataURL({ format: "png", multiplier: PAGE_THUMBNAIL_MULTIPLIER })
      : undefined;

  return { fabricJson, thumbnail };
};

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapperEl = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<any>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const autosaveTimer = useRef<number>();
  const previousActivePageIdRef = useRef<string>();
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

    const queueSave = (pageId: string) => {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;
        const snapshot = snapshotPage(currentCanvas);
        updateDoc((state) => ({
          ...state,
          pages: state.pages.map((page) => (page.id === pageId ? { ...page, ...snapshot } : page))
        }));
      }, AUTOSAVE_DEBOUNCE_MS);
    };

    const trackSave = () => {
      const pageId = useEditorStore.getState().doc.activePageId;
      queueSave(pageId);
    };

    canvas.on("object:added", trackSave);
    canvas.on("object:removed", trackSave);
    canvas.on("object:modified", trackSave);
    canvas.on("text:editing:exited", trackSave);

    onReady({ canvas, history });

    return () => {
      unbindSelection?.();
      history.unbind();
      canvas.off("object:added", trackSave);
      canvas.off("object:removed", trackSave);
      canvas.off("object:modified", trackSave);
      canvas.off("text:editing:exited", trackSave);
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

    const previousPageId = previousActivePageIdRef.current;
    if (!previousPageId) {
      previousActivePageIdRef.current = doc.activePageId;
      return;
    }

    if (previousPageId !== doc.activePageId) {
      window.clearTimeout(autosaveTimer.current);
      const snapshot = snapshotPage(canvas);
      updateDoc((state) => ({
        ...state,
        pages: state.pages.map((page) => (page.id === previousPageId ? { ...page, ...snapshot } : page))
      }));
      previousActivePageIdRef.current = doc.activePageId;
      void history.loadSnapshot(active.fabricJson, { capture: true });
    }
  }, [doc.activePageId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyCanvasDimensions(canvas, doc.canvas.width, doc.canvas.height);
    canvas.backgroundColor = doc.canvas.background;
    canvas.requestRenderAll?.();
    canvas.renderAll?.();
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

  return (
    <div ref={wrapperEl} className="h-full w-full overflow-auto bg-slate-200 p-6">
      <canvas ref={canvasEl} className="shadow-2xl" />
    </div>
  );
}
