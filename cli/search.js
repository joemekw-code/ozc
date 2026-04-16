#!/usr/bin/env node
// `ozc search "<query>"` — personal search combining:
//   1. On-chain OzIndex (global, priced by conviction)
//   2. Local files (your own data, your choice of database)
//
// Usage:
//   ozc search "decentralized trust"
//   ozc search "bitcoin" --local ~/Documents
//   ozc search "AI agents" --local ~/notes --local ~/research
//
// Output: merged results, ranked by relevance × price (if priced)

import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";

const IDX = "0x7e846cfe52c2c5118a1d7f132c3212a21500889f";
const RPC = process.env.OZC_RPC || "https://base-rpc.publicnode.com";
const IDX_ABI = [
  { name:"count", type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"range", type:"function", stateMutability:"view",
    inputs:[{type:"uint256"},{type:"uint256"}],
    outputs:[{type:"tuple[]", components:[
      {name:"location",type:"string"},{name:"aiMemo",type:"string"},
      {name:"owner",type:"address"},{name:"lockedOZC",type:"uint256"},
      {name:"totalBacked",type:"uint256"},{name:"listPriceOZC",type:"uint256"},{name:"exists",type:"bool"}
    ]}] },
];

const client = createPublicClient({ chain: base, transport: http(RPC) });

// ── parse args ──
const args = process.argv.slice(2);
const localDirs = [];
let query = "";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--local" && args[i+1]) { localDirs.push(args[++i]); }
  else if (!query) { query = args[i]; }
  else { query += " " + args[i]; }
}
if (!query) { console.error("Usage: ozc search \"<query>\" [--local <dir>] ..."); process.exit(1); }

const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

function score(text) {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const t of tokens) if (lower.includes(t)) hits++;
  return hits / tokens.length; // 0..1
}

// ── 1. on-chain search ──
async function searchOnChain() {
  const n = await client.readContract({ address: IDX, abi: IDX_ABI, functionName: "count" });
  if (n === 0n) return [];
  const list = await client.readContract({ address: IDX, abi: IDX_ABI, functionName: "range", args: [0n, n] });
  return list
    .filter(e => e.exists)
    .map(e => {
      const s = score(e.location + " " + e.aiMemo);
      const backed = Number(formatUnits(e.totalBacked, 18));
      return {
        source: "onchain",
        location: e.location,
        memo: e.aiMemo,
        relevance: s,
        priceOZC: backed,
        combined: s * 0.5 + (backed > 0 ? Math.log10(backed + 1) * 0.1 : 0) + (s > 0 ? 0.5 : 0),
      };
    })
    .filter(r => r.relevance > 0);
}

// ── 2. local search ──
function searchLocal() {
  const results = [];
  const TEXT_EXT = new Set([".md",".txt",".json",".html",".py",".js",".ts",".sol",".csv",".yml",".yaml",".toml"]);

  function walk(dir, depth = 0) {
    if (depth > 4) return;
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const full = join(dir, name);
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.isDirectory()) { walk(full, depth + 1); continue; }
      if (!TEXT_EXT.has(extname(name).toLowerCase())) continue;
      if (stat.size > 500_000) continue; // skip large files
      try {
        const content = readFileSync(full, "utf8");
        const s = score(name + " " + content.slice(0, 2000));
        if (s > 0) {
          results.push({
            source: "local",
            location: full,
            memo: content.slice(0, 200).replace(/\n/g, " "),
            relevance: s,
            priceOZC: 0,
            combined: s,
          });
        }
      } catch {}
    }
  }

  for (const d of localDirs) walk(d);
  return results;
}

// ── merge ──
const [onchain, local] = await Promise.all([searchOnChain(), Promise.resolve(searchLocal())]);
const merged = [...onchain, ...local].sort((a, b) => b.combined - a.combined);

if (merged.length === 0) {
  console.log("no results.");
} else {
  console.log(`\n  ${merged.length} results for "${query}"\n`);
  for (const r of merged.slice(0, 20)) {
    const price = r.priceOZC > 0 ? ` [${r.priceOZC} OZC backed]` : "";
    const tag = r.source === "onchain" ? "GLOBAL" : "LOCAL ";
    console.log(`  ${tag}  rel=${r.relevance.toFixed(2)}${price}`);
    console.log(`         ${r.location}`);
    console.log(`         ${r.memo.slice(0, 120)}`);
    console.log();
  }
}
