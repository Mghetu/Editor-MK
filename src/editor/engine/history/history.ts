import type { Canvas } from "fabric";
import { loadCanvasJson, saveCanvasJson } from "../serialize";

export class HistoryManager {
  private undoStack: unknown[] = [];
  private redoStack: unknown[] = [];
  private timer?: number;

  constructor(private canvas: Canvas) {}

  bind() {
    const track = () => this.captureDebounced();
    this.canvas.on("object:added", track);
    this.canvas.on("object:removed", track);
    this.canvas.on("object:modified", track);
    this.canvas.on("text:editing:exited", track);
  }

  captureDebounced(wait = 300) {
    clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.capture(), wait);
  }

  capture() {
    this.undoStack.push(saveCanvasJson(this.canvas));
    this.redoStack = [];
  }

  async undo() {
    if (this.undoStack.length < 2) return;
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    await loadCanvasJson(this.canvas, this.undoStack[this.undoStack.length - 1]);
  }

  async redo() {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(next);
    await loadCanvasJson(this.canvas, next);
  }
}
