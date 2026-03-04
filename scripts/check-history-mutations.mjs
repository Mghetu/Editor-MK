import { execSync } from "node:child_process";

const ALLOWLIST = new Set([
  "src/editor/features/autoLayout.ts",
  "src/editor/features/crop/CropModeController.ts",
  "src/editor/features/crop/cropOverlay.ts",
  "src/editor/features/imageGrid.ts",
  "src/editor/features/shapes/shapeGeometry.ts",
]);

const cmd = 'rg -n "\\.set\\(" src/editor/ui src/editor/features src/editor/engine/factories';
const output = execSync(cmd, { encoding: "utf8" }).trim();

if (!output) {
  console.log("No direct .set(...) calls found in scoped paths.");
  process.exit(0);
}

const files = new Set(
  output
    .split("\n")
    .map((line) => line.split(":")[0])
    .filter(Boolean)
);

const unexpected = [...files].filter((file) => !ALLOWLIST.has(file)).sort();

if (unexpected.length > 0) {
  console.error("Unexpected direct .set(...) usage outside allowlist:");
  unexpected.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log(`History mutation guard passed (${files.size} allowlisted files).`);
