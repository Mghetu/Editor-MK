import type { Canvas } from "fabric";
import { loadCanvasJson, saveCanvasJson } from "../serialize";

type HistoryAction = "add" | "remove" | "modify" | "text-edit" | "snapshot";

type HistoryEntry = {
  snapshot: unknown;
  action: HistoryAction;
  objectId?: string;
  timestamp: number;
};

type CommitMeta = {
  action: HistoryAction;
  objectId?: string;
  coalesce?: boolean;
};

const MAX_HISTORY_ENTRIES = 120;
const DEFAULT_DEBOUNCE_MS = 280;
const TEXT_DEBOUNCE_MS = 600;
const COALESCE_WINDOW_MS = 450;

const getObjectId = (event?: any): string | undefined => {
  const target = event?.target as any;
  return target?.data?.id ?? target?.id;
};

export class HistoryManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private timer?: number;
  private textTimer?: number;
  private isApplyingSnapshot = false;
  private listeners?: {
    onAdded: (event: any) => void;
    onRemoved: (event: any) => void;
    onModified: (event: any) => void;
    onTextChanged: (event: any) => void;
    onTextEditExit: (event: any) => void;
  };

  constructor(private canvas: Canvas) {}

  bind(): void {
    if (this.listeners) return;

    this.listeners = {
      onAdded: (event) => this.track({ action: "add", objectId: getObjectId(event), coalesce: false }),
      onRemoved: (event) => this.track({ action: "remove", objectId: getObjectId(event), coalesce: false }),
      onModified: (event) => this.track({ action: "modify", objectId: getObjectId(event), coalesce: true }),
      onTextChanged: (event) => this.captureDebounced(TEXT_DEBOUNCE_MS, { action: "text-edit", objectId: getObjectId(event), coalesce: true }),
      onTextEditExit: (event) => this.track({ action: "text-edit", objectId: getObjectId(event), coalesce: true })
    };

    this.canvas.on("object:added", this.listeners.onAdded);
    this.canvas.on("object:removed", this.listeners.onRemoved);
    this.canvas.on("object:modified", this.listeners.onModified);
    this.canvas.on("text:changed", this.listeners.onTextChanged);
    this.canvas.on("text:editing:exited", this.listeners.onTextEditExit);
  }

  unbind(): void {
    if (!this.listeners) return;

    this.canvas.off("object:added", this.listeners.onAdded);
    this.canvas.off("object:removed", this.listeners.onRemoved);
    this.canvas.off("object:modified", this.listeners.onModified);
    this.canvas.off("text:changed", this.listeners.onTextChanged);
    this.canvas.off("text:editing:exited", this.listeners.onTextEditExit);
    this.listeners = undefined;

    clearTimeout(this.timer);
    clearTimeout(this.textTimer);
    this.timer = undefined;
    this.textTimer = undefined;
  }

  private track(meta: CommitMeta): void {
    if (this.isApplyingSnapshot) return;
    this.captureDebounced(DEFAULT_DEBOUNCE_MS, meta);
  }

  captureDebounced(wait = DEFAULT_DEBOUNCE_MS, meta: CommitMeta = { action: "snapshot", coalesce: false }): void {
    const isText = meta.action === "text-edit";
    if (isText) {
      clearTimeout(this.textTimer);
      this.textTimer = window.setTimeout(() => this.capture(meta), wait);
      return;
    }

    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.capture(meta), wait);
  }

  capture(meta: CommitMeta = { action: "snapshot", coalesce: false }): void {
    const entry: HistoryEntry = {
      snapshot: saveCanvasJson(this.canvas),
      action: meta.action,
      objectId: meta.objectId,
      timestamp: Date.now()
    };

    const last = this.undoStack[this.undoStack.length - 1];
    const shouldCoalesce =
      meta.coalesce &&
      !!last &&
      last.action === entry.action &&
      last.objectId !== undefined &&
      last.objectId === entry.objectId &&
      entry.timestamp - last.timestamp <= COALESCE_WINDOW_MS;

    if (shouldCoalesce) {
      this.undoStack[this.undoStack.length - 1] = entry;
    } else {
      this.undoStack.push(entry);
      if (this.undoStack.length > MAX_HISTORY_ENTRIES) {
        this.undoStack.splice(0, this.undoStack.length - MAX_HISTORY_ENTRIES);
      }
    }

    this.redoStack = [];
  }

  async loadSnapshot(json: unknown, options?: { capture?: boolean }): Promise<void> {
    this.isApplyingSnapshot = true;
    try {
      await loadCanvasJson(this.canvas, json);
      if (options?.capture) {
        this.capture({ action: "snapshot", coalesce: false });
      }
    } finally {
      this.isApplyingSnapshot = false;
    }
  }

  undo(): Promise<void> {
    if (this.undoStack.length < 2) {
      return Promise.resolve();
    }

    const current = this.undoStack.pop();
    if (!current) {
      return Promise.resolve();
    }

    this.redoStack.push(current);
    return this.loadSnapshot(this.undoStack[this.undoStack.length - 1].snapshot);
  }

  redo(): Promise<void> {
    const next = this.redoStack.pop();
    if (!next) {
      return Promise.resolve();
    }

    this.undoStack.push(next);
    return this.loadSnapshot(next.snapshot);
  }
}

export default HistoryManager;
