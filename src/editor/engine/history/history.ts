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

  undo() {
    if (this.undoStack.length < 2) return Promise.resolve();
    const current = this.undoStack.pop();
    this.redoStack.push(current);
    return loadCanvasJson(this.canvas, this.undoStack[this.undoStack.length - 1]);
  }

  redo() {
    const next = this.redoStack.pop();
    if (!next) return Promise.resolve();
    this.undoStack.push(next);
    return loadCanvasJson(this.canvas, next);
  }
}


export default HistoryManager;
