#!/usr/bin/env node
// OZC Indexer — outputs all data entries as JSON for any agent to consume.
// Usage: node index.js  (no args, no setup)

import { createPublicClient, http, formatUnits } from "viem";
import { base } from "viem/chains";

const REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754"; // V2 with creator commissions
const FAUCET   = "0x9221f6fa294b39a7d9d3e65f1d70ca3cdd760623";
const RPC      = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const ABI = [
  { name:"nextId",       type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"entries",      type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[
      {name:"hash",type:"bytes32"},{name:"creator",type:"address"},{name:"metadata",type:"string"},
      {name:"shareSupply",type:"uint256"},{name:"ozcReserve",type:"uint256"},
      {name:"capacityBytes",type:"uint256"},{name:"exists",type:"bool"}
  ]},
  { name:"currentPrice", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"uint256"}] },
];

const client = createPublicClient({ chain: base, transport: http(RPC) });

const nextId = await client.readContract({ address: REGISTRY, abi: ABI, functionName: "nextId" });

const entries = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
for (let i = 0n; i < nextId; i++) {
  const e     = await client.readContract({ address: REGISTRY, abi: ABI, functionName: "entries",      args: [i] });
  await sleep(150);
  const price = await client.readContract({ address: REGISTRY, abi: ABI, functionName: "currentPrice", args: [i] });
  await sleep(150);
  let meta = {};
  try { meta = JSON.parse(e[2]); } catch {}
  entries.push({
    id:           Number(i),
    hash:         e[0],
    creator:      e[1],
    title:        meta.title || null,
    description:  meta.description || null,
    claim_type:   meta.claim_type || null,
    shareSupply:  e[3].toString(),
    marketCapOZC: formatUnits(e[4], 18),
    nextPriceOZC: formatUnits(price, 18),
  });
}

console.log(JSON.stringify({
  network:  "base-mainnet",
  registry: REGISTRY,
  count:    Number(nextId),
  entries
}, null, 2));
