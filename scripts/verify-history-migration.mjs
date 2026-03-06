import { execSync } from "node:child_process";

const COMMANDS = [
  "npm run check:history-mutations",
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
