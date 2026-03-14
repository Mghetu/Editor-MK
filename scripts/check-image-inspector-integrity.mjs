import { readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src/editor/ui/inspector/ImageInspector.tsx");
const source = readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

const countConst = (name) => {
  const rx = new RegExp(`^\\s{2}const\\s+${name}\\s*=`);
  const matches = [];
  lines.forEach((line, idx) => {
    if (rx.test(line)) matches.push(idx + 1);
  });
  return matches;
};

const errors = [];
for (const handler of ["onApplyCropPermanently", "onApplyCrop", "onCancelCrop", "onStartCrop"]) {
  const matches = countConst(handler);
  if (matches.length !== 1) {
    errors.push(`single ${handler} declaration required (found ${matches.length} at lines ${matches.join(", ") || "none"})`);
  }
}

if (errors.length > 0) {
  console.error("ImageInspector integrity check failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("ImageInspector integrity check passed.");
