#!/usr/bin/env node
// `ozc rag-status [dir]` — show what's in your local RAG (file inventory)
// `ozc rag-status ~/Documents ~/notes`
//
// Outputs: file count by type, total size, sample entries — so you know what your AI can see.

import { readdirSync, statSync, readFileSync } from "fs";
import { join, extname } from "path";

const dirs = process.argv.slice(2);
if (!dirs.length) {
  console.error("Usage: ozc rag-status <dir> [<dir2> ...]");
  console.error("Shows what files your personal RAG contains.");
  process.exit(1);
}

const TEXT_EXT = new Set([".md",".txt",".json",".html",".py",".js",".ts",".sol",".csv",".yml",".yaml",".toml",".sh",".jsx",".tsx",".rs",".go",".pdf"]);
const stats = { total: 0, byExt: {}, totalBytes: 0, samples: [] };

function walk(dir, depth = 0) {
  if (depth > 5) return;
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    if (name.startsWith(".") || name === "node_modules" || name === "out" || name === "cache") continue;
    const full = join(dir, name);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { walk(full, depth + 1); continue; }
    const ext = extname(name).toLowerCase();
    if (!TEXT_EXT.has(ext)) continue;
    stats.total++;
    stats.byExt[ext] = (stats.byExt[ext] || 0) + 1;
    stats.totalBytes += st.size;
    if (stats.samples.length < 10) {
      let preview = "";
      try { preview = readFileSync(full, "utf8").slice(0, 100).replace(/\n/g, " "); } catch {}
      stats.samples.push({ path: full, size: st.size, ext, preview });
    }
  }
}

for (const d of dirs) walk(d);

console.log(`\n=== Your Local RAG Inventory ===\n`);
console.log(`Directories scanned: ${dirs.join(", ")}`);
console.log(`Total indexable files: ${stats.total}`);
console.log(`Total size: ${(stats.totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`\nBy type:`);
for (const [ext, n] of Object.entries(stats.byExt).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${ext.padEnd(8)} ${n} files`);
}
console.log(`\nSamples (first 10):`);
for (const s of stats.samples) {
  console.log(`  ${s.path}`);
  console.log(`    ${s.preview.slice(0, 80)}...`);
}
console.log(`\nこれがあなたの AI が 'ozc search --local' で見えるデータです。`);
console.log(`追加したければ dir を増やす。減らしたければ dir を絞る。あなたが決める。\n`);
