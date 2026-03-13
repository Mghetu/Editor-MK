import { readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src/editor/features/crop/CropModeController.ts");
const source = readFileSync(file, "utf8");
const lines = source.split(/\r?\n/);

const findMethodLines = (name, { async = false, allowPrivate = true } = {}) => {
  const asyncPart = async ? "(?:async\\s+)" : "(?:async\\s+)?";
  const privatePart = allowPrivate ? "(?:private\\s+)?" : "";
  const rx = new RegExp(`^\\s{2}${privatePart}${asyncPart}${name}\\s*\\(`);
  const matches = [];
  lines.forEach((line, idx) => {
    if (rx.test(line)) matches.push(idx + 1);
  });
  return matches;
};

const shorthandTargetLines = [];
lines.forEach((line, idx) => {
  if (line.includes('{ target }')) shorthandTargetLines.push(idx + 1);
});

const explicitTargetLines = [];
lines.forEach((line, idx) => {
  if (line.includes('{ target: modifiedTarget }')) explicitTargetLines.push(idx + 1);
});

const applyLines = findMethodLines("applyPermanently", { async: true, allowPrivate: false });
const cancelLines = findMethodLines("cancel", { async: false, allowPrivate: false });
const bindLines = findMethodLines("bindCropEvents", { async: false, allowPrivate: true });

const errors = [];
if (applyLines.length !== 1) {
  errors.push(`single applyPermanently implementation (found ${applyLines.length} at lines ${applyLines.join(", ") || "none"})`);
}
if (cancelLines.length !== 1) {
  errors.push(`single cancel implementation (found ${cancelLines.length} at lines ${cancelLines.join(", ") || "none"})`);
}
if (bindLines.length !== 1) {
  errors.push(`single bindCropEvents implementation (found ${bindLines.length} at lines ${bindLines.join(", ") || "none"})`);
}
if (shorthandTargetLines.length > 0) {
  errors.push(`no shorthand object:modified target usage (found at lines ${shorthandTargetLines.join(", ")})`);
}
if (explicitTargetLines.length !== 1) {
  errors.push(`single explicit object:modified target usage (found ${explicitTargetLines.length} at lines ${explicitTargetLines.join(", ") || "none"})`);
}

if (errors.length > 0) {
  console.error("CropModeController integrity check failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("CropModeController integrity check passed.");
