import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const scripts = packageJson?.scripts ?? {};

const hasScript = (name) => Object.prototype.hasOwnProperty.call(scripts, name);

const resolveHistoryMutationCommand = () => {
  if (hasScript("check:history-mutations")) {
    return "npm run check:history-mutations";
  }

  const fallback = join(process.cwd(), "scripts", "check-history-mutations.mjs");
  if (existsSync(fallback)) {
    return "node scripts/check-history-mutations.mjs";
  }

  return null;
};

const historyMutationCommand = resolveHistoryMutationCommand();
if (!historyMutationCommand) {
  throw new Error(
    "Missing history mutation check: define npm script 'check:history-mutations' or add scripts/check-history-mutations.mjs"
  );
}

const COMMANDS = [
  "npm run repair:crop-controller",
  "npm run check:crop-controller-integrity",
  historyMutationCommand,
  "npm test",
  "npm run build"
];

const MODES = [
  { label: "history-disabled", env: {} },
  { label: "history-enabled", env: { VITE_USE_COMMAND_HISTORY: "true" } }
];

for (const mode of MODES) {
  console.log(`\n=== Verifying ${mode.label} ===`);
  for (const cmd of COMMANDS) {
    console.log(`\n$ ${cmd}`);
    execSync(cmd, {
      stdio: "inherit",
      env: { ...process.env, ...mode.env }
    });
  }
}

console.log("\nHistory migration verification passed in both modes.");
