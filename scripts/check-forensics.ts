// Prints the hidden-text findings for every demo resume.
import fs from "node:fs";
import path from "node:path";
import { analysePdf } from "../src/lib/forensics";

const root = path.join(process.cwd(), "data", "demo", "candidates");
for (const id of fs.readdirSync(root)) {
  const f = analysePdf(new Uint8Array(fs.readFileSync(path.join(root, id, "resume.pdf"))));
  console.log(`\n## ${id}: ${f.hidden.length} hidden segment(s)`);
  for (const h of f.hidden) console.log(`  [${h.reason}] ${h.text.slice(0, 110)}`);
}
