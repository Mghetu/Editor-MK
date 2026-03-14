import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src/editor/ui/inspector/ImageInspector.tsx");
let source = readFileSync(file, "utf8");
let lines = source.split(/\r?\n/);

const handlers = ["onStartCrop", "onCancelCrop", "onApplyCrop", "onApplyCropPermanently"];

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
    if (seenOpening && depth === 0 && line.trim().endsWith("};")) {
      return i;
    }
  }

  return startLine;
};

const toRemove = [];
for (const name of handlers) {
  const rx = new RegExp(`^\\s{2}const\\s+${name}\\s*=`);
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (!rx.test(lines[i])) continue;
    const end = findBlockEnd(i);
    matches.push({ start: i, end });
    i = end;
  }

  if (matches.length > 1) {
    matches.slice(0, -1).forEach((m) => toRemove.push(m));
  }
}

toRemove.sort((a, b) => b.start - a.start);
for (const block of toRemove) {
  lines.splice(block.start, block.end - block.start + 1);
}

source = lines.join("\n")
  .replace(/\n?\s*announceCropMode\((?:true|false)\);?/g, "");

if (source !== readFileSync(file, "utf8")) {
  writeFileSync(file, source);
  console.log(`Repaired ImageInspector (${toRemove.length} duplicate handler blocks removed).`);
} else {
  console.log("ImageInspector already normalized.");
}
