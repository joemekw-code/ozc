#!/usr/bin/env node
// `ozc timeline <address>` — show that wallet's full OZC history in time order.
// N=1 value: even with no other users, your own log of judgments is visible & exportable.

import { createPublicClient, http, parseAbiItem, formatUnits } from "viem";
import { base } from "viem/chains";

const REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const FAUCET   = "0xea827C90a2ed12afcebBFaF5CBd577c10905222d";
const RPC      = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const EV_DEPLOYED = parseAbiItem("event Deployed(uint256 indexed id, bytes32 hash, address indexed creator, string metadata)");
const EV_STAKED   = parseAbiItem("event Staked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcPaid, uint256 commission)");
const EV_UNSTAKED = parseAbiItem("event Unstaked(uint256 indexed id, address indexed staker, uint256 shares, uint256 ozcReturned)");
const EV_CLAIMED  = parseAbiItem("event Claimed(address indexed recipient, address indexed sponsor, uint256 amount)");
const EV_COMMISSION = parseAbiItem("event CommissionPaid(uint256 indexed id, address indexed creator, uint256 amount)");

const REG_ABI = [{ name:"entries", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"bytes32"},{type:"address"},{type:"string"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}] }];

export async function timeline(address) {
  const lower = address.toLowerCase();
  const client = createPublicClient({ chain: base, transport: http(RPC) });

  // Registry deployed at block 26614000 approx (early Apr 14). Use 26000000 as safe lower bound.
  const fromBlock = 26000000n;
  const latest    = await client.getBlockNumber();

  const [deploys, stakedAsStaker, stakedAsCreator, unstakes, claims, commissions] = await Promise.all([
    client.getLogs({ address: REGISTRY, event: EV_DEPLOYED,   args: { creator: address }, fromBlock, toBlock: latest }),
    client.getLogs({ address: REGISTRY, event: EV_STAKED,     args: { staker:  address }, fromBlock, toBlock: latest }),
    // need creator-targeted filter — Staked has only id+staker indexed, so we filter all by id->creator after:
    Promise.resolve([]),
    client.getLogs({ address: REGISTRY, event: EV_UNSTAKED,   args: { staker:  address }, fromBlock, toBlock: latest }),
    client.getLogs({ address: FAUCET,   event: EV_CLAIMED,    args: { recipient: address }, fromBlock, toBlock: latest }),
    client.getLogs({ address: REGISTRY, event: EV_COMMISSION, args: { creator: address }, fromBlock, toBlock: latest }),
  ]);

  const events = [];
  for (const e of deploys) {
    let m = {}; try { m = JSON.parse(e.args.metadata); } catch {}
    events.push({ block: Number(e.blockNumber), kind: "publish", id: Number(e.args.id), title: m.title, hash: e.args.hash });
  }
  for (const e of stakedAsStaker) {
    events.push({ block: Number(e.blockNumber), kind: "back", id: Number(e.args.id), units: e.args.shares.toString(), cost: formatUnits(e.args.ozcPaid, 18) });
  }
  for (const e of unstakes) {
    events.push({ block: Number(e.blockNumber), kind: "unback", id: Number(e.args.id), units: e.args.shares.toString(), proceeds: formatUnits(e.args.ozcReturned, 18) });
  }
  for (const e of claims) {
    events.push({ block: Number(e.blockNumber), kind: "faucet", amount: formatUnits(e.args.amount, 18), sponsor: e.args.sponsor });
  }
  for (const e of commissions) {
    events.push({ block: Number(e.blockNumber), kind: "earned", id: Number(e.args.id), amount: formatUnits(e.args.amount, 18) });
  }
  events.sort((a, b) => a.block - b.block);

  const totals = {
    published:    events.filter(e => e.kind === "publish").length,
    backings:     events.filter(e => e.kind === "back").length,
    unbackings:   events.filter(e => e.kind === "unback").length,
    earned_total: events.filter(e => e.kind === "earned").reduce((s, e) => s + Number(e.amount), 0),
    spent_backing:events.filter(e => e.kind === "back").reduce((s, e) => s + Number(e.cost), 0),
    recovered:    events.filter(e => e.kind === "unback").reduce((s, e) => s + Number(e.proceeds), 0),
  };

  return { address, totals, events };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const addr = process.argv[2];
  if (!addr) { console.error("Usage: ozc timeline <address>"); process.exit(1); }
  const t = await timeline(addr);
  console.log(`\n=== ${t.address} ===`);
  console.log(`published: ${t.totals.published}  backings: ${t.totals.backings}  unbackings: ${t.totals.unbackings}`);
  console.log(`spent backing: ${t.totals.spent_backing.toFixed(6)} signal · recovered: ${t.totals.recovered.toFixed(6)} · earned (creator): ${t.totals.earned_total.toFixed(6)}`);
  console.log(`pnl: ${(t.totals.earned_total + t.totals.recovered - t.totals.spent_backing).toFixed(6)} signal\n`);
  console.log("--- events ---");
  for (const e of t.events) {
    if (e.kind === "publish")  console.log(`#block ${e.block}  PUBLISH  #${e.id}  "${e.title || ""}"`);
    if (e.kind === "back")     console.log(`#block ${e.block}  BACK     #${e.id}  ${e.units} units  cost ${e.cost}`);
    if (e.kind === "unback")   console.log(`#block ${e.block}  UNBACK   #${e.id}  ${e.units} units  recovered ${e.proceeds}`);
    if (e.kind === "faucet")   console.log(`#block ${e.block}  FAUCET   ${e.amount} signal received`);
    if (e.kind === "earned")   console.log(`#block ${e.block}  EARNED   #${e.id}  +${e.amount} signal as creator`);
  }
}
