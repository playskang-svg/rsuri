import fs from "fs";
const data = JSON.parse(fs.readFileSync("web/lib/site-data.json", "utf8"));
const p = data.pages.find(p => p.content_type_fell_back === true);
console.log(p.evidence_ids);
console.log(p.required_modules);
console.log(p.missing_modules);
