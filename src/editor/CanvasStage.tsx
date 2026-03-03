import { useEffect, useRef } from "react";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import HistoryManager from "./engine/history/history";
import { useEditorStore } from "./state/useEditorStore";
import { saveCanvasJson } from "./engine/serialize";
import { refreshImageGrids } from "./features/imageGrid";

export type StageApi = { canvas: any; history: HistoryManager; persistNow: () => void };

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
      ? canvas.toDataURL({
          format: "png",
          multiplier: PAGE_THUMBNAIL_MULTIPLIER
        })
      : undefined;

  return { fabricJson, thumbnail };
};

const applyCanvasFrame = (canvas: any, docCanvas: { width: number; height: number; background: string }) => {
  applyCanvasDimensions(canvas, docCanvas.width, docCanvas.height);
  canvas.backgroundColor = docCanvas.background;
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  canvas.requestRenderAll?.();
};

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<any>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const autosaveTimer = useRef<number>();
  const previousActivePageIdRef = useRef<string>();
  const isHydratingRef = useRef(false);
  const { doc, setSelection, updateDoc } = useEditorStore();

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = createCanvas(canvasEl.current, doc.canvas.width, doc.canvas.height, doc.canvas.background);
    const history = new HistoryManager(canvas);
    canvasRef.current = canvas;
    historyRef.current = history;

    applyCanvasFrame(canvas, doc.canvas);

    history.bind();
    history.capture();

    const unbindSelection = bindSelectionEvents(canvas, setSelection);

    const persistPage = (pageId: string) => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;
      const snapshot = snapshotPage(currentCanvas);
      updateDoc((state) => ({
        ...state,
        pages: state.pages.map((page) => (page.id === pageId ? { ...page, ...snapshot } : page))
      }));
    };

    const queueSave = (pageId: string) => {
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => persistPage(pageId), AUTOSAVE_DEBOUNCE_MS);
    };

    const persistNow = () => {
      window.clearTimeout(autosaveTimer.current);
      const pageId = useEditorStore.getState().doc.activePageId;
      persistPage(pageId);
    };

    const trackSave = () => {
      if (isHydratingRef.current) return;
      const pageId = useEditorStore.getState().doc.activePageId;
      queueSave(pageId);
    };

    canvas.on("object:added", trackSave);
    canvas.on("object:removed", trackSave);
    canvas.on("object:modified", trackSave);
    canvas.on("text:editing:exited", trackSave);

    onReady({ canvas, history, persistNow });

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

    if (previousPageId === doc.activePageId) return;

    window.clearTimeout(autosaveTimer.current);
    const snapshot = snapshotPage(canvas);
    updateDoc((state) => ({
      ...state,
      pages: state.pages.map((page) => (page.id === previousPageId ? { ...page, ...snapshot } : page))
    }));

    previousActivePageIdRef.current = doc.activePageId;

    void (async () => {
      isHydratingRef.current = true;
      try {
        await history.loadSnapshot(active.fabricJson, { capture: true });
        applyCanvasFrame(canvas, useEditorStore.getState().doc.canvas);
      } finally {
        isHydratingRef.current = false;
      }
    })();
  }, [doc.activePageId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyCanvasFrame(canvas, doc.canvas);
    refreshImageGrids(canvas);
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] p-6">
      <canvas ref={canvasEl} />
    </div>
  );
}
