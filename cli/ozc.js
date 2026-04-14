#!/usr/bin/env node
import { createPublicClient, createWalletClient, http, keccak256, toBytes, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";
import { program } from "commander";
import { readFileSync, existsSync } from "fs";
import { config } from "dotenv";

config({ path: new URL("../.env", import.meta.url).pathname });

// ── config ────────────────────────────────────────────────────────────────────
const CHAIN      = process.env.CHAIN === "mainnet" ? base : baseSepolia;
const RPC_URL    = process.env.RPC_URL || "https://sepolia.base.org";
const PRIV_KEY   = process.env.PRIVATE_KEY;

const ADDRS_FILE = new URL("../deployments.json", import.meta.url).pathname;
const addrs = existsSync(ADDRS_FILE) ? JSON.parse(readFileSync(ADDRS_FILE)) : {};

// ── ABIs (minimal) ────────────────────────────────────────────────────────────
const TOKEN_ABI = [
  { name: "approve",   type: "function", inputs: [{name:"s",type:"address"},{name:"a",type:"uint256"}], outputs:[{type:"bool"}] },
  { name: "balanceOf", type: "function", inputs: [{name:"a",type:"address"}],                          outputs:[{type:"uint256"}] },
];

const REGISTRY_ABI = [
  { name: "deploy",       type: "function", inputs:[{name:"hash",type:"bytes32"},{name:"metadata",type:"string"},{name:"initialShares",type:"uint256"}], outputs:[{type:"uint256"}] },
  { name: "stake",        type: "function", inputs:[{name:"id",type:"uint256"},{name:"amount",type:"uint256"}], outputs:[] },
  { name: "unstake",      type: "function", inputs:[{name:"id",type:"uint256"},{name:"amount",type:"uint256"}], outputs:[] },
  { name: "currentPrice", type: "function", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"uint256"}] },
  { name: "marketCap",    type: "function", inputs:[{name:"id",type:"uint256"}], outputs:[{type:"uint256"}] },
  { name: "entries",      type: "function", inputs:[{name:"id",type:"uint256"}], outputs:[
      {name:"hash",type:"bytes32"},{name:"creator",type:"address"},{name:"metadata",type:"string"},
      {name:"shareSupply",type:"uint256"},{name:"ozcReserve",type:"uint256"},{name:"capacityBytes",type:"uint256"},{name:"exists",type:"bool"}
  ]},
  { name: "shares",       type: "function", inputs:[{name:"id",type:"uint256"},{name:"holder",type:"address"}], outputs:[{type:"uint256"}] },
  {
    name: "Deployed", type: "event",
    inputs:[{name:"id",type:"uint256",indexed:true},{name:"hash",type:"bytes32",indexed:false},{name:"creator",type:"address",indexed:true},{name:"metadata",type:"string",indexed:false}]
  },
];

// ── clients ───────────────────────────────────────────────────────────────────
function clients() {
  if (!PRIV_KEY) throw new Error("PRIVATE_KEY not set in .env");
  const account = privateKeyToAccount(PRIV_KEY.startsWith("0x") ? PRIV_KEY : `0x${PRIV_KEY}`);
  const pub  = createPublicClient({ chain: CHAIN, transport: http(RPC_URL) });
  const wal  = createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) });
  return { pub, wal, account };
}

// ── helpers ───────────────────────────────────────────────────────────────────
function ozc(n)  { return formatUnits(n, 18) + " OZC"; }
function addr(k) {
  if (!addrs[k]) throw new Error(`Address for ${k} not found. Run 'ozc set-addrs' first.`);
  return addrs[k];
}

// ── commands ──────────────────────────────────────────────────────────────────
program.name("ozc").description("OZC Data Market CLI").version("0.1.0");

program.command("set-addrs")
  .description("Save deployed contract addresses")
  .option("--token <addr>")
  .option("--registry <addr>")
  .option("--capacity <addr>")
  .action(({ token, registry, capacity }) => {
    const { writeFileSync } = await import("fs");
    const current = existsSync(ADDRS_FILE) ? JSON.parse(readFileSync(ADDRS_FILE)) : {};
    if (token)    current.token = token;
    if (registry) current.registry = registry;
    if (capacity) current.capacity = capacity;
    writeFileSync(ADDRS_FILE, JSON.stringify(current, null, 2));
    console.log("Saved:", current);
  });

program.command("balance")
  .description("Show OZC balance")
  .option("-a, --address <addr>")
  .action(async ({ address }) => {
    const { pub, account } = clients();
    const target = address || account.address;
    const bal = await pub.readContract({ address: addr("token"), abi: TOKEN_ABI, functionName: "balanceOf", args: [target] });
    console.log(`${target}: ${ozc(bal)}`);
  });

program.command("deploy")
  .description("Deploy a data entry to the registry")
  .requiredOption("--data <string>", "Raw data string (will be hashed)")
  .requiredOption("--title <string>")
  .requiredOption("--description <string>")
  .option("--shares <n>", "Initial shares to buy", "1")
  .action(async ({ data, title, description, shares }) => {
    const { pub, wal, account } = clients();
    const hash     = keccak256(toBytes(data));
    const metadata = JSON.stringify({ title, description, dataURI: data });
    const amount   = BigInt(shares);

    // approve
    await wal.writeContract({ address: addr("token"), abi: TOKEN_ABI, functionName: "approve",
      args: [addr("registry"), parseUnits("999999999", 18)] });

    const id = await wal.writeContract({
      address: addr("registry"), abi: REGISTRY_ABI, functionName: "deploy",
      args: [hash, metadata, amount]
    });

    console.log(`Deployed! tx: ${id}`);
    console.log(`Hash: ${hash}`);
  });

program.command("stake")
  .description("Stake OZC on a data entry")
  .requiredOption("--id <n>", "Entry ID")
  .requiredOption("--shares <n>", "Number of shares to buy")
  .action(async ({ id, shares }) => {
    const { pub, wal } = clients();
    const entryId = BigInt(id);
    const amount  = BigInt(shares);
    const price   = await pub.readContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "currentPrice", args: [entryId] });
    console.log(`Current price for 1 share: ${ozc(price)}`);

    await wal.writeContract({ address: addr("token"), abi: TOKEN_ABI, functionName: "approve",
      args: [addr("registry"), parseUnits("999999999", 18)] });

    const tx = await wal.writeContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "stake",
      args: [entryId, amount] });
    console.log(`Staked ${shares} share(s). tx: ${tx}`);
  });

program.command("unstake")
  .description("Unstake shares from a data entry")
  .requiredOption("--id <n>", "Entry ID")
  .requiredOption("--shares <n>", "Number of shares to sell")
  .action(async ({ id, shares }) => {
    const { wal } = clients();
    const tx = await wal.writeContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "unstake",
      args: [BigInt(id), BigInt(shares)] });
    console.log(`Unstaked ${shares} share(s). tx: ${tx}`);
  });

program.command("info")
  .description("Show data entry info")
  .requiredOption("--id <n>", "Entry ID")
  .action(async ({ id }) => {
    const { pub } = clients();
    const entryId = BigInt(id);
    const [entry, price, cap] = await Promise.all([
      pub.readContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "entries", args: [entryId] }),
      pub.readContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "currentPrice", args: [entryId] }),
      pub.readContract({ address: addr("registry"), abi: REGISTRY_ABI, functionName: "marketCap", args: [entryId] }),
    ]);
    const meta = JSON.parse(entry[2]);
    console.log(`\n── Entry #${id} ────────────────`);
    console.log(`Title      : ${meta.title}`);
    console.log(`Description: ${meta.description}`);
    console.log(`Creator    : ${entry[1]}`);
    console.log(`Shares     : ${entry[3]}`);
    console.log(`Market Cap : ${ozc(cap)}`);
    console.log(`Next Price : ${ozc(price)}`);
    console.log(`Hash       : ${entry[0]}`);
  });

program.parse();
