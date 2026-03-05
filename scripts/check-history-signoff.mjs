import { readFileSync } from "node:fs";

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

console.log("History migration signoff status:");
console.log(`- Automated verification: checked`);
console.log(`- Remaining manual items: ${remainingManual.length}`);
remainingManual.forEach((line) => console.log(`  - ${line.replace(/^- \[ \] /, "")}`));
