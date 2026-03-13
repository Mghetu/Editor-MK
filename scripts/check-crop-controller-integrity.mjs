import { readFileSync } from "node:fs";
import { join } from "node:path";

const file = join(process.cwd(), "src/editor/features/crop/CropModeController.ts");
const source = readFileSync(file, "utf8");

const methodCount = (name, { async = false, allowPrivate = true } = {}) => {
  const asyncPart = async ? "(?:async\\s+)" : "(?:async\\s+)?";
  const privatePart = allowPrivate ? "(?:private\\s+)?" : "";
  const rx = new RegExp(`^\\s{2}${privatePart}${asyncPart}${name}\\s*\\(`, "gm");
  return (source.match(rx) ?? []).length;
};

const checks = [
  {
    name: "single applyPermanently implementation",
    ok: methodCount("applyPermanently", { async: true, allowPrivate: false }) === 1
  },
  {
    name: "single cancel implementation",
    ok: methodCount("cancel", { async: false, allowPrivate: false }) === 1
  },
  {
    name: "single bindCropEvents implementation",
    ok: methodCount("bindCropEvents", { async: false, allowPrivate: true }) === 1
  },
  {
    name: "no shorthand object:modified target usage",
    ok: !source.includes('{ target }')
  }
];

const failed = checks.filter((check) => !check.ok);
if (failed.length > 0) {
  console.error("CropModeController integrity check failed:");
  failed.forEach((check) => console.error(` - ${check.name}`));
  process.exit(1);
}

console.log("CropModeController integrity check passed.");
