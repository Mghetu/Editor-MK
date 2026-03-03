# In-depth Code Review: Editor-MK "actual editor"

## Scope and methodology

This review focuses on the runtime editor stack under `src/editor/**` (Fabric canvas lifecycle, state orchestration, history, export, crop, and object factories), plus build/test signals.

Reviewed modules include:
- `CanvasStage` lifecycle and persistence wiring.
- `HistoryManager` undo/redo model.
- Serialization + hydration (`saveCanvasJson`/`loadCanvasJson`).
- Export flows (single page/image/ZIP).
- Crop mode controller.
- Object factories used by the UI.

Commands run:
- `npm test`
- `npm run build`

---

## Executive summary

The editor has a clear, pragmatic architecture and is feature-complete for a Canva-like MVP. Core concepts are separated reasonably well (state, canvas, history, feature controllers), and the codebase is understandable.

The most important problems are **state consistency and side effects** during export/page persistence, and one **resource leak** in image import.

### Priority findings

1. **High** — ZIP export mutates the live canvas and does not restore the original page state afterward.
2. **High** — Active-page autosave uses debounce; export can read stale page JSON if called before pending save flushes.
3. **Medium** — `URL.createObjectURL` is never revoked after image import (memory leak over long sessions).
4. **Medium** — Autosave thumbnail generation can be expensive because each persist also computes a data URL snapshot.
5. **Medium** — History and page persistence are both event-driven and partially independent, which increases race-condition risk under rapid operations.

---

## What is strong

- **Clear lifecycle ownership**: `CanvasStage` owns Fabric creation/disposal and listener registration.
- **Usable history model**: coalescing + debounced capture keeps undo stack practical.
- **Serialization hardening for text objects**: malformed text payloads are sanitized (`text` fallback).
- **Crop implementation quality**: crop overlay/mask math and interaction state isolation are thoughtfully handled.
- **Docs quality**: `docs/EDITOR_INTERNALS.md` is aligned with implementation and helpful for onboarding.

---

## Findings and recommendations

## 1) High: ZIP export mutates working canvas and leaves editor on last exported page

### Evidence
`exportAllPagesZip` loops through `doc.pages`, repeatedly calling `loadCanvasJson(canvas, page.fabricJson)` directly on the live canvas used by the editor UI. It never restores the original snapshot at the end.

### Why it matters
- User can be visually teleported to the last page state after export.
- Selection/context/tooling can become inconsistent.
- If there are unsaved in-memory edits not yet persisted to `doc.pages`, the user may lose confidence because canvas state after export is not the same as before export.

### Recommended fix
- Save current live canvas JSON before export (`const original = saveCanvasJson(canvas)`).
- Wrap export loop in `try/finally` and restore via `await loadCanvasJson(canvas, original)`.
- Consider performing ZIP rendering on an offscreen temporary Fabric canvas instance to avoid mutating UI state at all.

---

## 2) High: debounced autosave can cause stale exports or stale page transitions

### Evidence
`CanvasStage` persists page JSON via a 350ms debounce timer. Exports consume `doc.pages[*].fabricJson`, which may lag behind in-canvas state.

### Why it matters
A user can click Export immediately after edits; resulting files may omit final changes if autosave timer has not fired.

### Recommended fix
- Add a synchronous `flushActivePageSnapshot()` utility in stage/controller layer.
- Call flush before export actions and before multi-page operations that depend on `doc.pages` canonical snapshots.
- Optionally expose `stage.persistNow()` from `CanvasStage` API.

---

## 3) Medium: object URL leak in image import

### Evidence
`addImageFromFile` creates an object URL via `URL.createObjectURL(file)` and never calls `URL.revokeObjectURL(url)`.

### Why it matters
Repeated uploads increase retained memory for the lifetime of the tab (especially with large images).

### Recommended fix
- `try/finally` around `FabricImage.fromURL`, revoking URL in finally.
- Revoke only after Fabric image element has loaded.

---

## 4) Medium: autosave persistence path is heavier than needed

### Evidence
Each page snapshot includes a thumbnail via `canvas.toDataURL` (`PAGE_THUMBNAIL_MULTIPLIER = 0.15`) during autosave.

### Why it matters
Generating data URLs on frequent edit events can produce UI jank on large canvases/low-end devices.

### Recommended fix
- Decouple thumbnail generation from critical autosave path.
- Update thumbnail lazily (e.g., on idle, page switch, explicit save, or throttled >2s).

---

## 5) Medium: dual event systems (history + autosave) increase ordering complexity

### Evidence
`HistoryManager` and `CanvasStage` both subscribe to overlapping Fabric events (`object:added/removed/modified`, text events), each with separate debouncing logic.

### Why it matters
This can produce subtle timing issues:
- Undo stack reflects newer state than persisted page JSON (or vice versa).
- Rapid sequences may produce non-intuitive undo/export behavior.

### Recommended fix
- Introduce a single "change coordinator" abstraction that emits one normalized change stream.
- Let history and persistence subscribe to that stream with explicit ordering guarantees.

---

## Additional improvements (lower priority)

- Add integration tests for:
  - "Edit → immediate export" correctness.
  - "Undo/redo across page switch" edge sequences.
- Reduce `any` surface for stage API and Fabric objects where practical.
- Consider guarding global `window.__editorCanvas` usage behind a typed adapter module.

---

## Validation status

- Unit tests currently pass (`cropMath` tests).
- Production build succeeds, but bundle warning shows a large JS chunk (~652 kB), suggesting code-splitting opportunities.
