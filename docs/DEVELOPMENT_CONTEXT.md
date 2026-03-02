# Development Context for Editor-MK

> Purpose: this document is the **day-to-day development context** for adding features safely in Editor-MK.
> It is intentionally practical: where to make changes, what invariants to preserve, and which flows are easy to break.

---

## 1) What this editor is (product + technical stance)

Editor-MK is a static, client-side Canva-like editor built with **React + TypeScript + Fabric.js**.

### Product capabilities implemented today
- Multi-page document editing
- Basic content tools (text, image, shape, table)
- Crop mode for image edits
- Export current page / selected image / all pages as zip
- Snapshot-based undo/redo

### Architectural stance
- Fabric canvas is the rendering and object runtime.
- Zustand `useEditorStore` is the document/UI source of truth.
- Per-page persistence is JSON snapshots (`fabricJson`) + optional thumbnails.
- Most UI modules currently access canvas via `window.__editorCanvas`.

---

## 2) Start here when adding any feature

Read in this order before coding:

1. `src/editor/EditorShell.tsx` (shell wiring, hotkeys, stage ownership)
2. `src/editor/CanvasStage.tsx` (canvas lifecycle + autosave + page hydration)
3. `src/editor/state/documentModel.ts` and `src/editor/state/useEditorStore.ts` (document/store contract)
4. One existing feature of similar complexity:
   - create-object features in `src/editor/engine/factories/*`
   - modal tool pattern in `src/editor/features/crop/CropModeController.ts`

---

## 3) Mental model you should keep while coding

### 3.1 Single active Fabric canvas, many persisted pages
- Runtime has one active Fabric canvas instance.
- Switching pages saves current canvas -> prior page JSON, then loads next page JSON.
- If you mutate canvas during background operations (e.g. export-all), expect visible canvas changes unless isolated.

### 3.2 Every meaningful object should carry `data` metadata
- Selection, inspectors, layer list, and feature routing depend on `obj.data` fields.
- Minimum expected shape: `{ id, type, name }`.

### 3.3 “If it doesn’t emit/change snapshots, it can be lost”
- Persistence and history rely on object events and snapshot capture.
- Unusual mutation paths must still result in render + snapshot-friendly updates.

---

## 4) Non-negotiable invariants (do not break)

1. **Document shape compatibility**
   - Keep `DocModel` backward compatible unless explicitly migrating.
2. **Per-page isolation**
   - Changes should persist to the active page only.
3. **Stable object identity semantics**
   - Duplicates/new objects must use new `data.id` values.
4. **History safety**
   - Undo/redo should not capture while replaying snapshots.
5. **Selection correctness**
   - Tool overlays (like crop overlays) should not poison normal selection state.
6. **Serialization completeness**
   - Custom properties required by a feature must be included in JSON save/load paths.

---

## 5) Practical feature development workflow

Use this checklist for any new tool/feature:

### Step A — Choose integration surface
- New left panel action? add in `src/editor/ui/panels/*` and route via `LeftSidebar.tsx`.
- New inspector behavior? route from `RightInspector.tsx` by `selectedObjectType`.
- New global command/hotkey? wire in `EditorShell.tsx` and `hotkeys.ts`.

### Step B — Define object contract
- Decide object type string (`data.type`) and metadata fields.
- Add creation logic in `src/editor/engine/factories/` when object-centric.

### Step C — Add runtime controller (if mode-based)
- Put controller under `src/editor/features/<feature>/`.
- Explicitly bind/unbind all Fabric event listeners.
- Preserve/restore pre-tool interaction state if temporarily locking canvas/object interactivity.

### Step D — Make it persistent
- Ensure custom fields are included in `saveCanvasJson` whitelist.
- If needed, register custom Fabric properties (see image crop props pattern in `createCanvas.ts`).

### Step E — Confirm history + page-switch behavior
- Verify edits produce undo snapshots.
- Verify page switch saves your edits and reloads correctly.

### Step F — Export implications
- If feature changes renderable output, verify current-page export and zip export reflect it.

---

## 6) High-risk zones (frequent regressions)

### 6.1 Page switching and autosave races
`CanvasStage.tsx` has debounced save and hydration guards. New async operations that mutate canvas can accidentally persist the wrong page if not sequenced carefully.

### 6.2 Crop mode interaction locking
Crop mode temporarily disables interactions for non-active objects and introduces overlay objects. Forgetting cleanup leaves canvas in a broken interaction state.

### 6.3 Table/group behavior
Tables are Fabric `Group` objects with child objects. Generic inspectors and transforms may behave differently for grouped children vs top-level objects.

### 6.4 Export-all side effects
ZIP export reuses the visible canvas and loads each page sequentially. UI flicker/current-state disturbance is expected unless a separate off-screen canvas is introduced.

---

## 7) File-level ownership map (who should change what)

- **Document/store contract**: `src/editor/state/documentModel.ts`, `src/editor/state/useEditorStore.ts`
- **Canvas lifecycle + persistence**: `src/editor/CanvasStage.tsx`
- **Fabric setup/runtime normalization**: `src/editor/engine/createCanvas.ts`, `src/editor/engine/serialize.ts`
- **Undo/redo semantics**: `src/editor/engine/history/history.ts`
- **Feature controllers**: `src/editor/features/*`
- **Object creation**: `src/editor/engine/factories/*`
- **Top-level UI command surface**: `src/editor/ui/TopBar.tsx`, `src/editor/ui/Toolbar.tsx`
- **Navigation/panel layout**: `src/editor/ui/LeftSidebar.tsx`, `src/editor/ui/panels/*`
- **Inspector editing UX**: `src/editor/ui/RightInspector.tsx`, `src/editor/ui/inspector/*`

---

## 8) Definition of done for new features (Editor-MK specific)

A feature is “done” only if:

- It is reachable from UI and follows existing interaction conventions.
- It updates/render correctly on Fabric canvas.
- It survives page switch (persisted in page JSON).
- Undo/redo works for expected interactions.
- It does not break selection state or layer list behavior.
- It appears correctly in exports where relevant.
- It has clear type metadata and serialization support.

---

## 9) Suggested next refactors (to improve feature velocity)

1. Replace global `window.__editorCanvas` usage with a typed context or store-backed stage handle.
2. Split rendering canvas from export canvas for side-effect-free zip export.
3. Formalize feature controller lifecycle interface (enter/exit/dispose) to standardize mode tools.
4. Add integration tests around page-switch persistence + history replay.

These are optional improvements, but they directly reduce regressions when feature count grows.
