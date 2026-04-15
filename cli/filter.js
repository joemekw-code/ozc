#!/usr/bin/env node
// OZC filter primitives — personal information filter for any AI / agent / RAG pipeline.
//
// Pattern: give us a list of URLs (or any identifiers). We return the same list,
// annotated with on-chain OZC data (committedETH, shares, backers). You write your own
// ranking/filter logic. We don't impose a single answer.
//
// Usage (JS):
//   import { enrich, enrichAuthor } from "@joejoejoejoe/ozc/cli/filter.js";
//   const rows = await enrich(["https://a.com/x", "https://b.com/y"]);
//   // rows[0] = { identifier, id, committedETH, shares, nextPriceETH }
//
// Usage (CLI):
//   echo '["https://a.com/x","https://b.com/y"]' | ozc filter
//   → JSON output of annotated list

import { createPublicClient, http, keccak256, toBytes, formatUnits } from "viem";
import { base } from "viem/chains";

const UV_ADDR = "0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd";
const CV_ADDR = "0x675d23f2e14ee862846e375ba385eae567d5d985";
const REG     = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const RPC     = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const UV_ABI = [
  { name:"shareSupply", type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
  { name:"reserve",     type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
  { name:"buyPriceNext",type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
];
const CV_ABI = [
  { name:"totalReceivedAsCreator", type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
];

const client = createPublicClient({ chain: base, transport: http(RPC) });

/// Enrich a list of identifiers (URLs, hashes, text) with OZC on-chain signals.
/// Returns the same array order, each element annotated.
export async function enrich(identifiers) {
  const out = [];
  for (const identifier of identifiers) {
    const id = keccak256(toBytes(identifier));
    try {
      const [supply, reserve, next] = await Promise.all([
        client.readContract({ address: UV_ADDR, abi: UV_ABI, functionName: "shareSupply", args:[id] }),
        client.readContract({ address: UV_ADDR, abi: UV_ABI, functionName: "reserve",     args:[id] }),
        client.readContract({ address: UV_ADDR, abi: UV_ABI, functionName: "buyPriceNext",args:[id] }),
      ]);
      out.push({
        identifier,
        id,
        committedETH:     Number(formatUnits(reserve, 18)),
        committedWei:     reserve.toString(),
        shares:           Number(supply),
        nextPriceETH:     Number(formatUnits(next, 18)),
      });
    } catch (e) {
      out.push({ identifier, id, committedETH: 0, shares: 0, nextPriceETH: 0, error: e.message });
    }
  }
  return out;
}

/// Reputation score for an address = total ETH received as creator across all their claims.
export async function enrichAuthor(address) {
  const earned = await client.readContract({
    address: CV_ADDR, abi: CV_ABI, functionName: "totalReceivedAsCreator", args:[address]
  });
  return {
    address,
    totalReceivedETH: Number(formatUnits(earned, 18)),
    totalReceivedWei: earned.toString(),
  };
}

/// Simple weighted ranker. User provides weights. We compute a composite score.
/// Weights object keys: committedETH, shares, nextPriceETH
/// Example: rank(items, { committedETH: 1.0 })  → pure ETH ranking
///          rank(items, { committedETH: 0.7, shares: 0.3 }) → mixed
export function rank(enrichedItems, weights = { committedETH: 1.0 }) {
  // normalize each dimension
  const dims = Object.keys(weights);
  const maxs = {};
  for (const d of dims) maxs[d] = Math.max(...enrichedItems.map(x => x[d] || 0), 1e-18);
  return enrichedItems
    .map(item => {
      let s = 0;
      for (const d of dims) s += (weights[d] || 0) * ((item[d] || 0) / maxs[d]);
      return { ...item, score: s };
    })
    .sort((a, b) => b.score - a.score);
}

/// Filter: drop items below a threshold on any dimension.
/// Example: minCommittedETH(items, 0.00001)
export function minCommittedETH(items, min) {
  return items.filter(x => (x.committedETH || 0) >= min);
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  let input = "";
  process.stdin.on("data", c => input += c);
  process.stdin.on("end", async () => {
    const items = JSON.parse(input || "[]");
    const enriched = await enrich(items);
    console.log(JSON.stringify(enriched, null, 2));
  });
}
