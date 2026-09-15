import { parseCTModV06 } from "./lib/content-model.mjs";
import fs from "fs";

const md = fs.readFileSync(".ct-mod-v0.6-source.md", "utf8");
const result = parseCTModV06(md);
const fellBack = result.pages.filter(p => p.computedCT !== p.intendedCT);
for(const p of fellBack) {
  console.log(`[${p.keyword}] intended: ${p.intendedCT}, computed: ${p.computedCT}, missing: ${p.missingModules?.join(", ")}`);
}
