import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ALLOWLIST = new Set([]);
const SCAN_DIRS = ["src/editor/ui", "src/editor/features", "src/editor/engine/factories"];

const collectFiles = (dir) => {
  const abs = join(process.cwd(), dir);
  const entries = readdirSync(abs);
  const files = [];
  for (const entry of entries) {
    const full = join(abs, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...collectFiles(relative(process.cwd(), full)));
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry)) continue;
    files.push(relative(process.cwd(), full));
  }
  return files;
};

const scanWithNode = () => {
  const files = new Set();
  for (const dir of SCAN_DIRS) {
    const candidates = collectFiles(dir);
    for (const file of candidates) {
      try {
        const text = readFileSync(join(process.cwd(), file), "utf8");
        if (/\.set\(/.test(text)) files.add(file);
      } catch {
        // ignore unreadable files
      }
    }
  }
  return files;
};

const scanWithRipgrep = () => {
  const cmd = 'rg -n "\\.set\\(" src/editor/ui src/editor/features src/editor/engine/factories';
  const output = execSync(cmd, { encoding: "utf8" }).trim();
  if (!output) return new Set();
  return new Set(
    output
      .split("\n")
      .map((line) => line.split(":")[0])
      .filter(Boolean)
  );
};

let files;
try {
  files = scanWithRipgrep();
} catch (error) {
  const isMissingRg = Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number(error.status) === 127
  );
  const isNoMatches = Boolean(
    error &&
      typeof error === "object" &&
      "status" in error &&
      Number(error.status) === 1
  );

  if (isNoMatches) {
    files = new Set();
  } else if (isMissingRg) {
    files = scanWithNode();
  } else {
    throw error;
  }
}

if (!files || files.size === 0) {
  console.log("No direct .set(...) calls found in scoped paths.");
  process.exit(0);
}

const unexpected = [...files].filter((file) => !ALLOWLIST.has(file)).sort();

if (unexpected.length > 0) {
  console.error("Unexpected direct .set(...) usage outside allowlist:");
  unexpected.forEach((file) => console.error(` - ${file}`));
  process.exit(1);
}

console.log(`History mutation guard passed (${files.size} allowlisted files).`);
