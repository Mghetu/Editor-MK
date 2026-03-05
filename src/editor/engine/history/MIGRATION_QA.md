# Command History Migration QA Checklist

This checklist is the final closeout step after direct `.set(...)` migration has reached zero allowlist exceptions.

## Preconditions

- Command history builds and tests pass.
- `npm run check:history-mutations` reports no direct `.set(...)` in scoped paths.
- Run QA once with command history **disabled** and once with it **enabled** (`VITE_USE_COMMAND_HISTORY=true`) to compare behavior.

## Core Undo/Redo Scenarios

1. **Add/Edit/Delete lifecycle**
   - Add text, shape, image, table.
   - Edit each object (position, size, style).
   - Delete each object.
   - Undo all actions to blank canvas, redo back to final state.

2. **Reorder operations**
   - Bring forward / send backward for mixed object stacks.
   - Verify undo/redo preserves z-order deterministically.

3. **Transform transaction integrity**
   - Drag/scale/rotate an object with multiple pointer moves.
   - Verify one user interaction becomes one history intent (not noisy per-frame commands).
   - Undo returns to exact pre-transform state.

## Feature-Specific Scenarios

4. **Crop mode**
   - Enter crop, move/scale crop frame, apply.
   - Undo/redo apply.
   - Enter crop and cancel.
   - Verify interaction lock/unlock is restored correctly after exit.

5. **Image grid**
   - Create grid from each major preset.
   - Replace one slot image, replace multiple images, shuffle, swap.
   - Resize grid frame and verify slot reflow.
   - Select different slots and confirm selected outline/label behavior.
   - Undo/redo all steps and confirm slot metadata (`selectedSlotId`, image assignment, frame size) remains consistent.

6. **Shape radius/metadata**
   - Edit uniform radius and per-corner radii.
   - Scale shape after edits.
   - Verify render parity and undo/redo symmetry.

## Stability/Consistency Checks

7. **Session stress**
   - Perform a long mixed session (50+ operations across features).
   - Undo to start and redo to end.
   - Confirm no orphan objects, stale selection handles, or mismatched metadata.

8. **Guardrail verification**
   - Re-run:
     - `npm run check:history-mutations`
     - `npm test`
     - `npm run build`

## Exit Criteria

Migration is complete when:

- All scenarios pass in both history-disabled and history-enabled runs.
- Undo/redo parity is visually and structurally stable.
- Guardrail/tests/build all pass.
