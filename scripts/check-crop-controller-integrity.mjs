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

const methodMatches = [];
const methodRx = /^\s{2}(?:private\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
lines.forEach((line, idx) => {
  const match = methodRx.exec(line);
  if (match) methodMatches.push({ name: match[1], line: idx + 1 });
});

const duplicateMethods = new Map();
for (const method of methodMatches) {
  const current = duplicateMethods.get(method.name) ?? [];
  current.push(method.line);
  duplicateMethods.set(method.name, current);
}

const objectModifiedShorthandLines = [];
const objectModifiedExplicitLines = [];
lines.forEach((line, idx) => {
  if (line.includes('canvas.fire("object:modified"') && line.includes('{ target }')) {
    objectModifiedShorthandLines.push(idx + 1);
  }
  if (line.includes('canvas.fire("object:modified"') && /\{\s*target\s*:\s*[^}]+\}/.test(line)) {
    objectModifiedExplicitLines.push(idx + 1);
  }
});

const staleModifiedTargetLines = [];
lines.forEach((line, idx) => {
  if (line.includes("modifiedTarget")) staleModifiedTargetLines.push(idx + 1);
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
if (objectModifiedShorthandLines.length > 0) {
  errors.push(`no shorthand object:modified target usage (found at lines ${objectModifiedShorthandLines.join(", ")})`);
}
if (objectModifiedExplicitLines.length < 1) {
  errors.push(`at least one explicit object:modified target usage (found ${objectModifiedExplicitLines.length} at lines ${objectModifiedExplicitLines.join(", ") || "none"})`);
}
if (staleModifiedTargetLines.length > 0) {
  errors.push(`no stale modifiedTarget references (found at lines ${staleModifiedTargetLines.join(", ")})`);
}

const duplicateReports = [...duplicateMethods.entries()]
  .filter(([, methodLines]) => methodLines.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

if (duplicateReports.length > 0) {
  duplicateReports.forEach(([methodName, methodLines]) => {
    errors.push(`duplicate method '${methodName}' (found ${methodLines.length} at lines ${methodLines.join(", ")})`);
  });
}

if (errors.length > 0) {
  console.error("CropModeController integrity check failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("CropModeController integrity check passed.");
