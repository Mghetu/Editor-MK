import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src/editor/features/crop/CropModeController.ts");
let source = readFileSync(file, "utf8");
let lines = source.split(/\r?\n/);

const methodRx = /^\s{2}(?:private\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/;

const findBlockEnd = (startLine) => {
  let depth = 0;
  let seenOpening = false;

  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") {
        depth += 1;
        seenOpening = true;
      } else if (ch === "}") {
        depth -= 1;
      }
    }

    if (seenOpening && depth === 0) {
      return i;
    }
  }

  return startLine;
};

const blocks = [];
for (let i = 0; i < lines.length; i++) {
  const match = methodRx.exec(lines[i]);
  if (!match) continue;
  const name = match[1];
  const end = findBlockEnd(i);
  blocks.push({ name, start: i, end });
  i = end;
}

const dedupeNames = new Set(["applyPermanently", "cancel", "bindCropEvents"]);
const byName = new Map();
for (const block of blocks) {
  if (!dedupeNames.has(block.name)) continue;
  const arr = byName.get(block.name) ?? [];
  arr.push(block);
  byName.set(block.name, arr);
}

const toRemove = [];
for (const [name, arr] of byName.entries()) {
  if (arr.length <= 1) continue;
  // Keep the last implementation; remove earlier duplicates.
  arr.slice(0, -1).forEach((block) => toRemove.push({ ...block, name }));
}

toRemove.sort((a, b) => b.start - a.start);
for (const block of toRemove) {
  lines.splice(block.start, block.end - block.start + 1);
}

source = lines.join("\n")
  .replace(/canvas\.fire\("object:modified",\s*\{ target \}\)/g, "canvas.fire(\"object:modified\", { target: this.image })")
  .replace(/canvas\.fire\("object:modified",\s*\{\s*target\s*:\s*modifiedTarget\s*\}\)/g, "canvas.fire(\"object:modified\", { target: this.image })")
  .replace(/\n?\s*const\s+modifiedTarget\s*=\s*this\.image;?/g, "")
  .replace(/\n?\s*if\s*\(\s*modifiedTarget\s*\)\s*\{\s*\n?\s*this\.canvas\.fire\("object:modified",\s*\{\s*target\s*:\s*this\.image\s*\}\);\s*\n?\s*\}/g, "\n    this.canvas.fire(\"object:modified\", { target: this.image });")
  .replace(/\s*const modifiedTarget = this\.image;\s*\n\s*this\.exit\(false\);\s*\n\s*this\.canvas\.requestRenderAll\(\);\s*\n\s*if \(modifiedTarget\) \{\s*\n\s*this\.canvas\.fire\("object:modified", \{ target: this\.image \}\);\s*\n\s*\}/g, "\n    this.exit(false);\n    this.canvas.requestRenderAll();\n    this.canvas.fire(\"object:modified\", { target: this.image });");

if (source !== readFileSync(file, "utf8")) {
  writeFileSync(file, source);
  console.log(`Repaired CropModeController (${toRemove.length} duplicate blocks removed).`);
} else {
  console.log("CropModeController already normalized.");
}
