import fs from "fs";
const file = "scripts/data/keyword-content/doorframe.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));

data.content.status_criteria = data.status_criteria;
data.content.pro_judgment = data.pro_judgment;
data.content.repair_vs_replace = data.repair_vs_replace;

delete data.status_criteria;
delete data.pro_judgment;
delete data.repair_vs_replace;

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("Fixed doorframe.json again");
