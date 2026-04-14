#!/usr/bin/env node
// Watch OZC activity: new entries, new backings, new wallets receiving signal.
// Usage: node watch.js  (prints events as they happen)

import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { base } from "viem/chains";

const REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const FAUCET   = "0xea827C90a2ed12afcebBFaF5CBd577c10905222d";
const RPC      = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const client = createPublicClient({ chain: base, transport: http(RPC) });

const EV_DEPLOYED = parseAbiItem("event Deployed(uint256 indexed id, bytes32 hash, address indexed creator, string metadata)");
const EV_STAKED   = parseAbiItem("event Staked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcPaid, uint256 commission)");
const EV_CLAIMED  = parseAbiItem("event Claimed(address indexed recipient, address indexed sponsor, uint256 amount)");

console.log("[watcher] starting — monitoring OZC on Base");
let fromBlock = await client.getBlockNumber();
console.log(`[watcher] starting at block ${fromBlock}`);

setInterval(async () => {
  const latest = await client.getBlockNumber();
  if (latest <= fromBlock) return;

  const [deploys, stakes, claims] = await Promise.all([
    client.getLogs({ address: REGISTRY, event: EV_DEPLOYED, fromBlock: fromBlock + 1n, toBlock: latest }),
    client.getLogs({ address: REGISTRY, event: EV_STAKED,   fromBlock: fromBlock + 1n, toBlock: latest }),
    client.getLogs({ address: FAUCET,   event: EV_CLAIMED,  fromBlock: fromBlock + 1n, toBlock: latest }),
  ]);

  for (const d of deploys) console.log(`[new claim  ] #${d.args.id} by ${d.args.creator}`);
  for (const s of stakes)  console.log(`[backing    ] #${s.args.id} by ${s.args.staker} — ${s.args.shares} units, cost ${formatUnits(s.args.ozcPaid, 18)} signal`);
  for (const c of claims)  console.log(`[new wallet ] ${c.args.recipient} received ${formatUnits(c.args.amount, 18)} signal (sponsor: ${c.args.sponsor})`);

  fromBlock = latest;
}, 5000);
