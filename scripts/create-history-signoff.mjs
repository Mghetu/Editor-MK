import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const commit = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
const now = new Date().toISOString();

const content = `# History Migration Signoff\n\nGenerated: ${now}\nCommit: ${commit}\n\n## Automated verification\n- [ ] \`npm run verify:history-migration\`\n\n## Manual verification\n- [ ] Manual QA run (history disabled)\n- [ ] Manual QA run (history enabled)\n- [ ] Crop scenarios pass\n- [ ] Image grid scenarios pass\n- [ ] Shape radius scenarios pass\n- [ ] Long-session undo/redo stress pass\n\n## Notes\n- Regressions found:\n- Follow-up fixes:\n`;

mkdirSync("docs", { recursive: true });
writeFileSync("docs/history-migration-signoff.md", content, "utf8");
console.log("Wrote docs/history-migration-signoff.md");
