# Command history invariants

1. Every user intent must produce exactly one committed `HistoryTransaction`.
2. Undo/redo operates over command apply/revert symmetry and does not call `loadFromJSON`, except explicit checkpoint recovery.
3. All object writes should go through command execution APIs (`execute`, transaction methods), not direct canvas mutations in UI code.
4. Runtime assertions should fail fast when command targets cannot be found by stable object id (`data.id`/`id`).
