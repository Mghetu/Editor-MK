import { loadCanvasJson, saveCanvasJson } from "../serialize";
import type { HistoryCommand, HistoryContext, HistoryTransaction, HistoryTransactionMeta } from "./commands/types";

type HistoryStateListener = (state: { canUndo: boolean; canRedo: boolean; lastLabel?: string }) => void;

type TransactionOptions = Omit<HistoryTransactionMeta, "startedAt" | "label">;

const CHECKPOINT_INTERVAL = 25;

export class CommandHistoryManager {
  private undoStack: HistoryTransaction[] = [];
  private redoStack: HistoryTransaction[] = [];
  private inFlight?: HistoryTransaction;
  private listeners = new Set<HistoryStateListener>();
  private checkpointCounter = 0;
  private checkpointJson?: unknown;

  constructor(private ctx: HistoryContext) {}

  subscribe(listener: HistoryStateListener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get lastActionLabel() {
    return this.undoStack[this.undoStack.length - 1]?.meta.label;
  }

  getState() {
    return { canUndo: this.canUndo, canRedo: this.canRedo, lastLabel: this.lastActionLabel };
  }

  private emit() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  async execute(command: HistoryCommand, opts: TransactionOptions = {}) {
    if (this.inFlight) {
      await command.apply(this.ctx);
      const current = this.inFlight.commands[this.inFlight.commands.length - 1];
      if (current?.merge?.(command)) return;
      this.inFlight.commands.push(command);
      this.inFlight.meta.objectIds = Array.from(new Set([...(this.inFlight.meta.objectIds ?? []), ...(command.objectIds ?? [])]));
      return;
    }

    await command.apply(this.ctx);
    const tx: HistoryTransaction = {
      commands: [command],
      meta: {
        label: command.label,
        startedAt: Date.now(),
        source: opts.source,
        objectIds: command.objectIds
      }
    };
    this.pushCommitted(tx);
  }

  beginTransaction(label: string, opts: TransactionOptions = {}) {
    if (this.inFlight) throw new Error("History transaction already in progress");
    this.inFlight = {
      commands: [],
      meta: {
        label,
        startedAt: Date.now(),
        source: opts.source,
        objectIds: opts.objectIds ?? []
      }
    };
  }

  commitTransaction() {
    if (!this.inFlight) return;
    if (this.inFlight.commands.length === 0) {
      this.inFlight = undefined;
      return;
    }
    this.pushCommitted(this.inFlight);
    this.inFlight = undefined;
  }

  async rollbackTransaction() {
    if (!this.inFlight) return;
    for (let i = this.inFlight.commands.length - 1; i >= 0; i -= 1) {
      await this.inFlight.commands[i].revert(this.ctx);
    }
    this.inFlight = undefined;
  }

  async undo() {
    if (this.inFlight) await this.rollbackTransaction();
    const tx = this.undoStack.pop();
    if (!tx) return;
    for (let i = tx.commands.length - 1; i >= 0; i -= 1) {
      await tx.commands[i].revert(this.ctx);
    }
    this.redoStack.push(tx);
    this.emit();
  }

  async redo() {
    if (this.inFlight) await this.rollbackTransaction();
    const tx = this.redoStack.pop();
    if (!tx) return;
    for (const command of tx.commands) {
      await command.apply(this.ctx);
    }
    this.undoStack.push(tx);
    this.emit();
  }

  private pushCommitted(transaction: HistoryTransaction) {
    this.undoStack.push(transaction);
    this.redoStack = [];
    this.checkpointCounter += 1;
    if (this.checkpointCounter % CHECKPOINT_INTERVAL === 0) {
      this.checkpointJson = saveCanvasJson(this.ctx.canvas);
    }
    this.emit();
  }

  async recoverFromCheckpoint() {
    if (!this.checkpointJson) return;
    await loadCanvasJson(this.ctx.canvas, this.checkpointJson);
  }
}
