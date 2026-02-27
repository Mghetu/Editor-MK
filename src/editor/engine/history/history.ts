import type { Canvas } from "fabric";
import { loadCanvasJson, saveCanvasJson } from "../serialize";

export class HistoryManager {
  private undoStack: unknown[] = [];
  private redoStack: unknown[] = [];
  private timer?: number;
  private isApplyingSnapshot = false;
  private listeners?: {
    onAdded: () => void;
    onRemoved: () => void;
    onModified: () => void;
    onTextEditExit: () => void;
  };

  constructor(private canvas: Canvas) {}

  bind(): void {
    if (this.listeners) return;

    const track = () => {
      if (this.isApplyingSnapshot) return;
      this.captureDebounced();
    };

    this.listeners = {
      onAdded: track,
      onRemoved: track,
      onModified: track,
      onTextEditExit: track
    };

    this.canvas.on("object:added", this.listeners.onAdded);
    this.canvas.on("object:removed", this.listeners.onRemoved);
    this.canvas.on("object:modified", this.listeners.onModified);
    this.canvas.on("text:editing:exited", this.listeners.onTextEditExit);
  }

  unbind(): void {
    if (!this.listeners) return;

    this.canvas.off("object:added", this.listeners.onAdded);
    this.canvas.off("object:removed", this.listeners.onRemoved);
    this.canvas.off("object:modified", this.listeners.onModified);
    this.canvas.off("text:editing:exited", this.listeners.onTextEditExit);
    this.listeners = undefined;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  captureDebounced(wait = 300): void {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.capture(), wait);
  }

  capture(): void {
    this.undoStack.push(saveCanvasJson(this.canvas));
    this.redoStack = [];
  }

  async loadSnapshot(json: unknown, options?: { capture?: boolean }): Promise<void> {
    this.isApplyingSnapshot = true;
    try {
      await loadCanvasJson(this.canvas, json);
      if (options?.capture) {
        this.capture();
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
    this.redoStack.push(current);
    return this.loadSnapshot(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): Promise<void> {
    const next = this.redoStack.pop();
    if (!next) {
      return Promise.resolve();
    }

    this.undoStack.push(next);
    return this.loadSnapshot(next);
  }
}

export default HistoryManager;
