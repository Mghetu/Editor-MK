import { readFileSync } from "node:fs";

const strict = process.argv.includes("--strict");
const json = process.argv.includes("--json");
const path = "docs/history-migration-signoff.md";
const content = readFileSync(path, "utf8");

const lines = content.split("\n");
const checkboxLines = lines.filter((line) => /^- \[[ xX]\]/.test(line.trim()));

if (checkboxLines.length === 0) {
  console.error(`No checklist items found in ${path}`);
  process.exit(1);
}

const automatedLine = checkboxLines.find((line) => line.includes("verify:history-migration"));
if (!automatedLine) {
  console.error("Missing automated verification checkbox.");
  process.exit(1);
}

const automatedChecked = /- \[[xX]\]/.test(automatedLine);
if (!automatedChecked) {
  console.error("Automated verification checkbox is not checked.");
  process.exit(1);
}

const remainingManual = checkboxLines
  .filter((line) => !line.includes("verify:history-migration"))
  .filter((line) => /- \[ \]/.test(line));

const status = {
  automatedVerificationChecked: true,
  remainingManualItems: remainingManual.map((line) => line.replace(/^- \[ \] /, "")),
  remainingManualCount: remainingManual.length
};

if (json) {
  console.log(JSON.stringify(status, null, 2));
} else {
  console.log("History migration signoff status:");
  console.log(`- Automated verification: checked`);
  console.log(`- Remaining manual items: ${remainingManual.length}`);
  remainingManual.forEach((line) => console.log(`  - ${line.replace(/^- \[ \] /, "")}`));
}

if (strict && remainingManual.length > 0) {
  console.error(`Strict signoff check failed: ${remainingManual.length} manual checklist items remain.`);
  process.exit(1);
}
