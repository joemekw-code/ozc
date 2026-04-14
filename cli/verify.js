#!/usr/bin/env node
// `ozc verify "<claim>"` — check if a claim is already on OZC, show its conviction.
// Used by agents BEFORE they assert a factual statement, to weigh OZC conviction against their own.

import { createPublicClient, http, keccak256, toBytes, formatUnits } from "viem";
import { base } from "viem/chains";

const REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const RPC      = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const ABI = [
  { name:"nextId",       type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"entries",      type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"bytes32"},{type:"address"},{type:"string"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}] },
];

const client = createPublicClient({ chain: base, transport: http(RPC) });

function normalize(s) {
  return String(s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
}
// Jaccard similarity on token sets — rough but adequate for near-duplicate detection.
function sim(a, b) {
  const A = new Set(normalize(a)), B = new Set(normalize(b));
  const inter = [...A].filter(x => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

export async function verify(claimText) {
  const exactHash = keccak256(toBytes(claimText));
  const n = await client.readContract({ address: REGISTRY, abi: ABI, functionName: "nextId" });

  const results = [];
  let exactMatch = null;

  for (let i = 0n; i < n; i++) {
    const e = await client.readContract({ address: REGISTRY, abi: ABI, functionName: "entries", args: [i] });
    if (e[0] === exactHash) {
      exactMatch = { id: Number(i), creator: e[1], signal: formatUnits(e[4], 18), supply: e[3].toString() };
    }
    let meta = {}; try { meta = JSON.parse(e[2]); } catch {}
    const corpus = `${meta.title || ""} ${meta.description || ""}`;
    const s = sim(claimText, corpus);
    if (s > 0.2) {
      results.push({ id: Number(i), title: meta.title, similarity: s.toFixed(2), signal: formatUnits(e[4], 18), supply: e[3].toString() });
    }
  }
  results.sort((a, b) => Number(b.similarity) - Number(a.similarity));
  return { claim: claimText, exactHash, exactMatch, similar: results.slice(0, 5) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const claim = process.argv.slice(2).join(" ");
  if (!claim) { console.error("Usage: node verify.js \"<claim text>\""); process.exit(1); }
  const r = await verify(claim);
  console.log(JSON.stringify(r, null, 2));
}
