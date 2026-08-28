import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

function findJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return findJavaScriptFiles(filePath);
    return entry.name.endsWith(".js") ? [filePath] : [];
  });
}

for (const filePath of findJavaScriptFiles("src")) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Backend JavaScript syntax check passed.");

