import { useEffect, useRef } from "react";
import { Pattern } from "fabric";
import { createCanvas } from "./engine/createCanvas";
import { bindSelectionEvents } from "./engine/selection";
import HistoryManager from "./engine/history/history";
import { CommandHistoryManager } from "./engine/history/transactionHistory";
import { createFabricHistoryContext, getFabricObjectId } from "./engine/history/fabricHistoryContext";
import { TransformObjectCommand } from "./engine/history/commands/basic";
import { USE_COMMAND_HISTORY } from "./engine/history/flags";
import { useEditorStore } from "./state/useEditorStore";
import { saveCanvasJson } from "./engine/serialize";
import { refreshImageGrids } from "./features/imageGrid";

export type StageApi = {
  canvas: any;
  history: HistoryManager;
  commandHistory?: CommandHistoryManager;
  persistNow: () => void;
};

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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const applyGridOverlay = (
  canvas: any,
  grid: { enabled: boolean; size: number; color: string; opacity: number }
) => {
  if (!grid.enabled) {
    canvas.overlayColor = undefined;
    canvas.requestRenderAll?.();
    return;
  }

  const spacing = clamp(Number(grid.size) || 20, 8, 400);
  const alpha = clamp(Number(grid.opacity) || 0.12, 0.04, 0.9);
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = spacing;
  patternCanvas.height = spacing;

  const ctx = patternCanvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, spacing, spacing);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.fillRect(0, 0, spacing, spacing);
  ctx.strokeStyle = grid.color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(spacing - 0.5, 0);
  ctx.lineTo(spacing - 0.5, spacing);
  ctx.moveTo(0, spacing - 0.5);
  ctx.lineTo(spacing, spacing - 0.5);
  ctx.stroke();

  canvas.overlayColor = new Pattern({
    source: patternCanvas,
    repeat: "repeat"
  });
  canvas.requestRenderAll?.();
};

const snapToGrid = (target: any, size: number) => {
  if (!target) return;
  const spacing = clamp(Number(size) || 20, 8, 400);
  if (Number.isFinite(target.left)) target.left = Math.round(target.left / spacing) * spacing;
  if (Number.isFinite(target.top)) target.top = Math.round(target.top / spacing) * spacing;
};

export function CanvasStage({ onReady }: { onReady: (api: StageApi) => void }) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<any>(null);
  const historyRef = useRef<HistoryManager | null>(null);
  const commandHistoryRef = useRef<CommandHistoryManager | null>(null);
  const autosaveTimer = useRef<number>();
  const previousActivePageIdRef = useRef<string>();
  const isHydratingRef = useRef(false);
  const activeTransformRef = useRef<{
    objectId: string;
    start: Record<string, unknown>;
    hasCommands: boolean;
  } | null>(null);
  const { doc, setSelection, updateDoc } = useEditorStore();

  useEffect(() => {
    if (!canvasEl.current) return;

    const canvas = createCanvas(canvasEl.current, doc.canvas.width, doc.canvas.height, doc.canvas.background);
    const history = new HistoryManager(canvas);
    const commandHistory = USE_COMMAND_HISTORY ? new CommandHistoryManager(createFabricHistoryContext(canvas)) : null;
    canvasRef.current = canvas;
    historyRef.current = history;
    commandHistoryRef.current = commandHistory;

    applyCanvasFrame(canvas, doc.canvas);
    applyGridOverlay(canvas, doc.grid);

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

    const readTransformState = (obj: any) => ({
      left: Number(obj?.left ?? 0),
      top: Number(obj?.top ?? 0),
      angle: Number(obj?.angle ?? 0),
      scaleX: Number(obj?.scaleX ?? 1),
      scaleY: Number(obj?.scaleY ?? 1),
      skewX: Number(obj?.skewX ?? 0),
      skewY: Number(obj?.skewY ?? 0),
      flipX: Boolean(obj?.flipX),
      flipY: Boolean(obj?.flipY),
      width: Number(obj?.width ?? 0),
      height: Number(obj?.height ?? 0)
    });

    const queueTransformCommand = (target: any) => {
      if (!commandHistory || !target) return;
      const session = activeTransformRef.current;
      const objectId = getFabricObjectId(target);
      if (!session || !objectId || session.objectId !== objectId) return;

      const nextState = readTransformState(target);
      const command = new TransformObjectCommand(objectId, nextState, session.hasCommands ? undefined : session.start);
      void commandHistory.execute(command, { source: "interaction", objectIds: [objectId] });
      session.hasCommands = true;
    };

    const beginTransform = (event: any) => {
      if (!commandHistory) return;
      const target = event?.target as any;
      const objectId = getFabricObjectId(target);
      if (!target || !objectId) return;

      activeTransformRef.current = {
        objectId,
        start: readTransformState(target),
        hasCommands: false
      };
      try {
        commandHistory.beginTransaction("Transform object", { source: "interaction", objectIds: [objectId] });
      } catch {
        activeTransformRef.current = null;
      }
    };

    const commitTransform = () => {
      if (!commandHistory || !activeTransformRef.current) return;
      commandHistory.commitTransaction();
      activeTransformRef.current = null;
    };

    const onMoving = (event: any) => {
      const { grid } = useEditorStore.getState().doc;
      if (grid.enabled && grid.snap) snapToGrid(event?.target, grid.size);
      queueTransformCommand(event?.target);
    };
    const onScaling = (event: any) => queueTransformCommand(event?.target);
    const onRotating = (event: any) => queueTransformCommand(event?.target);

    canvas.on("mouse:down", beginTransform);
    canvas.on("mouse:up", commitTransform);
    canvas.on("object:moving", onMoving);
    canvas.on("object:scaling", onScaling);
    canvas.on("object:rotating", onRotating);

    if (commandHistory) (window as any).__commandHistory = commandHistory;
    else delete (window as any).__commandHistory;

    onReady({ canvas, history, commandHistory: commandHistory ?? undefined, persistNow });

    return () => {
      unbindSelection?.();
      history.unbind();
      canvas.off("object:added", trackSave);
      canvas.off("object:removed", trackSave);
      canvas.off("object:modified", trackSave);
      canvas.off("text:editing:exited", trackSave);
      canvas.off("mouse:down", beginTransform);
      canvas.off("mouse:up", commitTransform);
      canvas.off("object:moving", onMoving);
      canvas.off("object:scaling", onScaling);
      canvas.off("object:rotating", onRotating);
      window.clearTimeout(autosaveTimer.current);
      canvasRef.current = null;
      historyRef.current = null;
      commandHistoryRef.current = null;
      delete (window as any).__commandHistory;
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
        commandHistoryRef.current?.clear();
        applyCanvasFrame(canvas, useEditorStore.getState().doc.canvas);
        applyGridOverlay(canvas, useEditorStore.getState().doc.grid);
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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    applyGridOverlay(canvas, doc.grid);
  }, [doc.grid]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1a1a] p-6">
      <canvas ref={canvasEl} />
    </div>
  );
}
