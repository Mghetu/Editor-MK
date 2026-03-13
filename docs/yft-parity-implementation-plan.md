# YFT-Design Parity Implementation Plan (for Editor-MK)

## Goal
Implement a staged, stable roadmap to bring Editor-MK close to `dromara/yft-design` **OSS** capabilities, with explicit replacement of the current crop workflow by a YFT-style crop system.

## Current baseline (Editor-MK)
Editor-MK already includes:
- multi-page editing (add/duplicate/delete, switch)
- core objects (text/image/table/shapes)
- crop mode with rectangle/circle masks and presets
- template manifest + template insertion flow
- export to PNG/JPG + selected image export
- undo/redo + hotkeys

This plan focuses on parity gaps and migration strategy.

---

## Architecture Strategy

### 0) Use the current UI (no full redesign)
Implementation must extend the existing Editor-MK UI shell and panels (`TopBar`, `Toolbar`, `LeftSidebar`, `RightInspector`, existing panel tabs) instead of introducing a new layout system.

UI guardrails for all phases:
- Keep current navigation and panel placement patterns.
- Add controls incrementally inside existing inspectors/panels first.
- Avoid disruptive interaction model changes unless required for correctness/performance.
- Preserve current shortcut patterns and context menu mental model while adding capabilities.

### 1) Keep Fabric.js core, add modular “interaction engines”
Introduce dedicated engines around Fabric instead of mixing all logic in panels/components:
- `rulerGuidesEngine`
- `snapEngine`
- `layersEngine`
- `selectionOpsEngine`
- `textStyleEngine`
- `imageFxEngine`
- `importExportEngine`

This mirrors YFT’s feature separation style and makes debugging/testing easier.

### 2) Add command-based mutations everywhere
You already have history infra; expand to make every feature use command objects for deterministic undo/redo:
- object transform
- style mutate
- layer move
- group/ungroup
- page reorder
- crop commit/cancel

### 3) Prefer workerized heavy pipelines
Use Web Workers for heavy operations:
- large SVG import normalization
- expensive image effect previews
- large image decoding and filter preview generation

---

## Crop Replacement Plan (erase current crop and adopt YFT-like model)

## Objective
Replace existing crop implementation with a non-destructive, transform-safe crop system similar to YFT’s custom crop controls/mixins behavior.

### Proposed implementation model
- Represent cropped image as:
  - source image + crop rect in source coordinates
  - viewport transform independent from crop rect
- Provide interactive crop handles on an overlay/control layer
- Commit crop by updating crop metadata only (not destructive pixel rewrite)
- Add optional destructive action: **Apply Permanently** (bakes current crop into a new bitmap)
- Preserve full undo/redo granularity (enter crop, drag handles, apply/cancel)

### Migration steps
1. **Deprecate existing crop controller/UI path**
   - keep feature flag fallback for one release
2. **Introduce `cropV2` model**
   - new type definitions + serializer compatibility
3. **Implement `CropOverlayV2` + controls**
   - corner/edge drag, constrained ratios, center maintain mode
4. **Hook into history command system**
   - atomic commit and cancel states
   - separate command for destructive `applyPermanently`
5. **Back-compat transform adapter**
   - read old crop values, translate to `cropV2`
6. **Remove old crop code** after migration confidence threshold

### Libraries to use
- `fabric` built-in crop APIs + custom controls extension (primary)
- `gl-matrix` (optional) for robust transform math if existing math grows unstable
- `zustand` selectors (already in app) for isolated crop mode state slices

### Validation
- golden tests for same input transform -> same output bbox
- interaction tests for rotate+crop+scale order
- regression tests for serialization/deserialization of cropped objects
- destructive-mode tests: apply permanently, undo, redo, export checks

---

## Feature Parity Roadmap

### V1 scope constraints
- Browser support: **latest Chrome only**
- No PDF import in V1
- No PSD import in V1
- No backward compatibility guarantee for all previously saved Editor-MK documents
- Use current UI shell/components; feature parity is implemented within the existing UI structure

## Phase 1 (Milestone 1 - highest priority)
**Target:** 2–3 weeks

1. CropV2 replacement (with optional destructive apply permanently)
2. Grid system (show/hide, spacing presets, snap-to-grid)
3. Shape tooling upgrade
4. Round corners for supported shapes and image masks
5. Text tooling upgrade (formatting + spacing controls)
6. Image import hardening (drag/drop, paste, upload, large image handling)

### Recommended libraries
- `@dnd-kit/core` + `@dnd-kit/sortable` for page/layer drag sorting
- `nanoid` for stable IDs where needed
- `browser-image-compression` (optional) for oversized uploads and stability

---

## Phase 2 (Canvas and structure UX)
**Target:** 2–4 weeks

1. Ruler + guide lines
2. Smart snapping (move/resize/center/edge)
3. Page reorder
4. Layer panel v2: hide/show, lock/unlock, rename, reorder
5. Context menu actions (duplicate, lock, bring front/back, align)

### Recommended libraries
- `polished` or small internal color utils for color transforms
- avoid heavy image libraries unless necessary; leverage Fabric filters + optional worker offload

---

## Phase 3 (Object editing parity)
**Target:** 3–5 weeks

1. Multi-select batch edit operations
2. Group/ungroup
3. Align/distribute (to selection and to canvas)
4. Shape/line advanced inspector
   - line dash styles
   - join/cap
5. Image effects panel
   - brightness/contrast/saturation/blur
   - tint/overlay
   - flip/border/shadow

### Notes
- Full word-processor parity is expensive; V1 uses best-effort bullets/indent behavior.

---

## Phase 4 (Text system and export parity)
**Target:** 4–8 weeks

1. SVG import normalization + SVG export hardening
2. Multi-page PDF export
3. Rich text toolbar completion (bold/italic/underline/strikethrough/alignment)
4. Typography controls completion (line height, letter spacing, paragraph spacing)
5. Bullet/indent + clear formatting polish

### Recommended libraries
- PDF export: `pdf-lib` (preferred for control) or `jsPDF`
- Optional raster support: `sharp-wasm` or browser canvas pipeline for specific transforms

### Canvas sizes (V1)
Ship a size preset library for:
- Most-used social media formats (Instagram, Facebook, X/Twitter, LinkedIn, YouTube, TikTok, Pinterest)
- A4 (portrait and landscape)
- Custom width/height

---

## Cross-cutting engineering requirements

1. **Performance budgets**
   - <16ms interaction budget for move/resize on average documents
   - progressive rendering for large documents
2. **State consistency**
   - no direct object mutation outside command layer
3. **Telemetry hooks**
   - local dev tracing for command latency and frame drops
4. **Compatibility gates**
   - schema versioning for document format
5. **Test pyramid**
   - unit: geometry/transforms/history commands
   - integration: inspector -> canvas updates
   - snapshot/golden: serialized docs and rendered exports

---

## Proposed package additions
- `@dnd-kit/core`, `@dnd-kit/sortable`
- `pdf-lib`
- `comlink` (worker communication ergonomics)
- `gl-matrix` (optional if transform bugs persist)
- `browser-image-compression` (optional; upload stability)

Only add packages per phase to reduce surface area and upgrade risk.

---

## Delivery sequence (recommended)
1. CropV2 replacement + optional destructive apply permanently
2. Grid + shapes + round corners + image import hardening
3. Ruler/guides/snap + layers/pages/context menu parity
4. Group/align/distribute + image FX
5. Text upgrade + SVG/PDF export hardening

This order maximizes immediate UX value while reducing refactor conflicts.

---

## Decisions captured from product direction

1. Scope target: YFT **OSS** parity for V1
2. Crop behavior: non-destructive default + optional destructive `Apply Permanently`
3. V1 excludes PDF/PSD import
4. Browser support: latest Chrome
5. Size presets: most-used social media sizes + A4
6. Text fidelity: best-effort bullets/indent is acceptable
7. Milestone 1 priorities: crop, grids, shapes, round corners, text, import images
8. Package policy proposal:
   - Keep core bundle lean; use dynamic imports for heavy/rare modules.
   - V1 dynamic-only candidates: advanced export helpers, large-image preprocessing, optional filters.
   - Gate optional modules by feature flags and usage analytics.
   - Set hard bundle budgets in CI (initial + async chunks) to prevent regressions.
9. File compatibility: no full backward compatibility requirement
10. QA workflow: add Playwright interaction tests from phase 1 (crop/snap/layers minimum)

---

## UI implementation mapping (current UI only)

- `TopBar`: document-level actions (export, size presets, view toggles like grid/ruler).
- `Toolbar`: quick object insertion and transform shortcuts.
- `LeftSidebar` + panel tabs: templates/assets/pages/layers related flows.
- `RightInspector`: context-sensitive controls for crop, text, shapes, corners, image effects.

New capabilities should be added to these existing surfaces first; no separate YFT-style shell clone in V1.
