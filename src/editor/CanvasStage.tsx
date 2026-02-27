import { useEffect, useRef } from "react";
import { Rect } from "fabric";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import HistoryManager from "./engine/history/history";
import { useEditorStore } from "./state/useEditorStore";
import { saveCanvasJson } from "./engine/serialize";

export type StageApi = { canvas: any; history: HistoryManager };

const AUTOSAVE_DEBOUNCE_MS = 350;
const PAGE_THUMBNAIL_MULTIPLIER = 0.15;
const WORKSPACE_PADDING = 180;
const GUIDE_KEY = "workspace-guide";
const WORKSPACE_BG = "#e2e8f0";

const applyCanvasDimensions = (canvas: any, width: number, height: number) => {
  if (typeof canvas?.setDimensions === "function") {
    canvas.setDimensions({ width, height });
    return;
  }
  if (typeof canvas?.setWidth === "function") canvas.setWidth(width);
  if (typeof canvas?.setHeight === "function") canvas.setHeight(height);
};

const getPageBounds = (canvas: any) => {
  const page = (canvas as any).__pageBounds;
  if (page) return page;
  return { left: 0, top: 0, width: canvas.getWidth?.() ?? 0, height: canvas.getHeight?.() ?? 0 };
};

const snapshotPage = (canvas: any) => {
  const fabricJson = saveCanvasJson(canvas);
  const bounds = getPageBounds(canvas);
  const thumbnail =
    typeof canvas?.toDataURL === "function"
      ? canvas.toDataURL({
          format: "png",
          multiplier: PAGE_THUMBNAIL_MULTIPLIER,
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height
        })
      : undefined;

  return { fabricJson, thumbnail };
};

const createGuideRect = (name: string, fill: string, options: Partial<Rect> = {}) =>
  new Rect({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    absolutePositioned: true,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    hoverCursor: "default",
    fill,
    excludeFromExport: true,
    data: { type: GUIDE_KEY, name },
    ...options
  } as any);

const ensureWorkspaceGuides = (
  canvas: any,
  pageW: number,
  pageH: number,
  pageBg: string,
  workspaceW: number,
  workspaceH: number
) => {
  const guides = canvas.getObjects().filter((obj: any) => obj?.data?.type === GUIDE_KEY);
  const byName: Record<string, any> = {};
  guides.forEach((g: any) => {
    byName[g?.data?.name] = g;
  });

  const pageFill = byName["page-fill"] ?? createGuideRect("page-fill", pageBg, { excludeFromExport: false });
  const topGuide = byName.top ?? createGuideRect("top", "rgba(255,255,255,0.55)");
  const leftGuide = byName.left ?? createGuideRect("left", "rgba(255,255,255,0.55)");
  const rightGuide = byName.right ?? createGuideRect("right", "rgba(255,255,255,0.55)");
  const bottomGuide = byName.bottom ?? createGuideRect("bottom", "rgba(255,255,255,0.55)");
  const borderGuide =
    byName.border ??
    createGuideRect("border", "rgba(0,0,0,0)", {
      stroke: "#3b82f6",
      strokeWidth: 2
    });

  pageFill.set({ left: WORKSPACE_PADDING, top: WORKSPACE_PADDING, width: pageW, height: pageH, fill: pageBg });
  topGuide.set({ left: 0, top: 0, width: workspaceW, height: WORKSPACE_PADDING });
  leftGuide.set({ left: 0, top: WORKSPACE_PADDING, width: WORKSPACE_PADDING, height: pageH });
  rightGuide.set({ left: WORKSPACE_PADDING + pageW, top: WORKSPACE_PADDING, width: WORKSPACE_PADDING, height: pageH });
  bottomGuide.set({ left: 0, top: WORKSPACE_PADDING + pageH, width: workspaceW, height: WORKSPACE_PADDING });
  borderGuide.set({ left: WORKSPACE_PADDING, top: WORKSPACE_PADDING, width: pageW, height: pageH });

  [pageFill, topGuide, leftGuide, rightGuide, bottomGuide, borderGuide].forEach((g) => {
    if (!canvas.getObjects().includes(g)) canvas.add(g);
  });

  if (typeof canvas.sendObjectToBack === "function") canvas.sendObjectToBack(pageFill);
  else pageFill.sendToBack?.();

  [topGuide, leftGuide, rightGuide, bottomGuide, borderGuide].forEach((g) => {
    if (typeof canvas.bringObjectToFront === "function") canvas.bringObjectToFront(g);
    else g.bringToFront?.();
  });
};

const applyWorkspaceFrame = (canvas: any, docCanvas: { width: number; height: number; background: string }) => {
  const workspaceW = docCanvas.width + WORKSPACE_PADDING * 2;
  const workspaceH = docCanvas.height + WORKSPACE_PADDING * 2;

  applyCanvasDimensions(canvas, workspaceW, workspaceH);
  canvas.backgroundColor = WORKSPACE_BG;
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  (canvas as any).__pageBounds = {
    left: WORKSPACE_PADDING,
    top: WORKSPACE_PADDING,
    width: docCanvas.width,
    height: docCanvas.height
  };

  ensureWorkspaceGuides(canvas, docCanvas.width, docCanvas.height, docCanvas.background, workspaceW, workspaceH);
  canvas.requestRenderAll?.();
};

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const wrapperEl = useRef<HTMLDivElement>(null);
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

    applyWorkspaceFrame(canvas, doc.canvas);

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

    const trackSave = (event: any) => {
      if (isHydratingRef.current) return;
      if (event?.target?.data?.type === GUIDE_KEY) return;
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
        applyWorkspaceFrame(canvas, useEditorStore.getState().doc.canvas);
      } finally {
        isHydratingRef.current = false;
      }
    })();
  }, [doc.activePageId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyWorkspaceFrame(canvas, doc.canvas);
  }, [doc.canvas.width, doc.canvas.height, doc.canvas.background]);

  return (
    <div ref={wrapperEl} className="h-full w-full overflow-auto bg-slate-200 p-6">
      <canvas ref={canvasEl} className="shadow-2xl" />
    </div>
  );
}
