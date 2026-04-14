#!/usr/bin/env node
// OZC MCP Server — drop-in tool layer for Claude Desktop / Cursor / Cline / any MCP client.
// Launch: node mcp-server.js  (register it in your MCP client config)
//
// Required env:
//   OZC_PRIVATE_KEY  — your Base wallet key (use a fresh one with small funds)
// Optional env:
//   OZC_RPC          — defaults to https://base-rpc.publicnode.com

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createPublicClient, createWalletClient, http, keccak256, toBytes, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const REGISTRY = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const TOKEN    = "0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144";
const FAUCET   = "0x9221f6fa294b39a7d9d3e65f1d70ca3cdd760623";
const RPC      = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const REGISTRY_ABI = [
  { name:"deploy",       type:"function", inputs:[{name:"hash",type:"bytes32"},{name:"metadata",type:"string"},{name:"initialShares",type:"uint256"}], outputs:[{type:"uint256"}] },
  { name:"stake",        type:"function", inputs:[{type:"uint256"},{type:"uint256"}], outputs:[] },
  { name:"unstake",      type:"function", inputs:[{type:"uint256"},{type:"uint256"}], outputs:[] },
  { name:"entries",      type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"bytes32"},{type:"address"},{type:"string"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}] },
  { name:"nextId",       type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"currentPrice", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"uint256"}] },
  { name:"shares",       type:"function", stateMutability:"view", inputs:[{type:"uint256"},{type:"address"}], outputs:[{type:"uint256"}] },
  { name:"creatorEarned",type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
];
const TOKEN_ABI = [
  { name:"approve",   type:"function", inputs:[{type:"address"},{type:"uint256"}], outputs:[{type:"bool"}] },
  { name:"balanceOf", type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
];
const FAUCET_ABI = [
  { name:"claim",   type:"function", inputs:[], outputs:[] },
  { name:"claimed", type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"bool"}] },
];

const pub = createPublicClient({ chain: base, transport: http(RPC) });

function wallet() {
  const key = process.env.OZC_PRIVATE_KEY;
  if (!key) throw new Error("OZC_PRIVATE_KEY not set in MCP server env");
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  const wal = createWalletClient({ account, chain: base, transport: http(RPC) });
  return { wal, account };
}

const tools = [
  {
    name: "ozc_list_entries",
    description: "List all data entries on OZC. Each entry has id, title, description, market cap, and current share price. Use this to discover what claims are being staked on.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "ozc_get_entry",
    description: "Get details of a specific OZC entry by id, including current price and your share holdings.",
    inputSchema: { type:"object", properties:{ id:{type:"integer"} }, required:["id"] },
  },
  {
    name: "ozc_claim_faucet",
    description: "Claim 100 OZC from the faucet (one-time per wallet). Required before first stake/deploy.",
    inputSchema: { type:"object", properties:{} },
  },
  {
    name: "ozc_stake",
    description: "Stake OZC on an entry id by buying shares. Automatically approves if needed. Creator earns 5% commission.",
    inputSchema: { type:"object", properties:{ id:{type:"integer"}, shares:{type:"integer", minimum:1} }, required:["id","shares"] },
  },
  {
    name: "ozc_unstake",
    description: "Sell shares back to the bonding curve to realize profit/loss.",
    inputSchema: { type:"object", properties:{ id:{type:"integer"}, shares:{type:"integer", minimum:1} }, required:["id","shares"] },
  },
  {
    name: "ozc_deploy_claim",
    description: "Deploy a new claim to OZC. You become creator and earn 5% of every future stake. Requires OZC balance (claim faucet first).",
    inputSchema: {
      type:"object",
      properties: {
        raw_data:    { type:"string", description:"The raw claim text; will be hashed on-chain." },
        title:       { type:"string" },
        description: { type:"string" },
        claim_type:  { type:"string", description:"historical_fact | prediction | meta | philosophical | other" },
      },
      required: ["raw_data","title","description"],
    },
  },
  {
    name: "ozc_balance",
    description: "Show OZC balance and creator earnings for the active wallet.",
    inputSchema: { type:"object", properties:{} },
  },
];

const server = new Server({ name:"ozc", version:"0.1.0" }, { capabilities:{ tools:{} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  try {
    switch (name) {
      case "ozc_list_entries": {
        const n = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"nextId" });
        const entries = [];
        for (let i = 0n; i < n; i++) {
          const e     = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"entries",      args:[i] });
          const price = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"currentPrice", args:[i] });
          let meta = {}; try { meta = JSON.parse(e[2]); } catch {}
          entries.push({
            id: Number(i), creator: e[1], title: meta.title, description: meta.description,
            claim_type: meta.claim_type || null,
            shareSupply: e[3].toString(),
            marketCapOZC: formatUnits(e[4], 18),
            nextPriceOZC: formatUnits(price, 18),
          });
        }
        return { content:[{ type:"text", text: JSON.stringify({ count: entries.length, entries }, null, 2) }] };
      }

      case "ozc_get_entry": {
        const id = BigInt(args.id);
        const e     = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"entries",      args:[id] });
        const price = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"currentPrice", args:[id] });
        let meta = {}; try { meta = JSON.parse(e[2]); } catch {}
        let yourShares = null;
        try {
          const { account } = wallet();
          yourShares = (await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"shares", args:[id, account.address] })).toString();
        } catch {}
        return { content:[{ type:"text", text: JSON.stringify({
          id: args.id, hash: e[0], creator: e[1], title: meta.title, description: meta.description,
          claim_type: meta.claim_type || null, shareSupply: e[3].toString(),
          marketCapOZC: formatUnits(e[4], 18), nextPriceOZC: formatUnits(price, 18),
          yourShares,
        }, null, 2) }] };
      }

      case "ozc_claim_faucet": {
        const { wal, account } = wallet();
        const already = await pub.readContract({ address: FAUCET, abi: FAUCET_ABI, functionName:"claimed", args:[account.address] });
        if (already) return { content:[{ type:"text", text: `Already claimed with ${account.address}` }] };
        const tx = await wal.writeContract({ address: FAUCET, abi: FAUCET_ABI, functionName:"claim" });
        return { content:[{ type:"text", text: `Claimed 100 OZC. tx: ${tx}` }] };
      }

      case "ozc_stake": {
        const { wal } = wallet();
        const id = BigInt(args.id), n = BigInt(args.shares);
        const approveTx = await wal.writeContract({ address: TOKEN, abi: TOKEN_ABI, functionName:"approve", args:[REGISTRY, parseUnits("1000000", 18)] });
        const stakeTx   = await wal.writeContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"stake", args:[id, n] });
        return { content:[{ type:"text", text: `Staked ${args.shares} shares on entry #${args.id}.\napprove tx: ${approveTx}\nstake tx:   ${stakeTx}` }] };
      }

      case "ozc_unstake": {
        const { wal } = wallet();
        const tx = await wal.writeContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"unstake", args:[BigInt(args.id), BigInt(args.shares)] });
        return { content:[{ type:"text", text: `Unstaked. tx: ${tx}` }] };
      }

      case "ozc_deploy_claim": {
        const { wal } = wallet();
        const hash = keccak256(toBytes(args.raw_data));
        const metadata = JSON.stringify({ title: args.title, description: args.description, claim_type: args.claim_type || null });
        const approveTx = await wal.writeContract({ address: TOKEN, abi: TOKEN_ABI, functionName:"approve", args:[REGISTRY, parseUnits("1000000", 18)] });
        const deployTx  = await wal.writeContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"deploy", args:[hash, metadata, 1n] });
        return { content:[{ type:"text", text: `Claim deployed.\nhash: ${hash}\napprove tx: ${approveTx}\ndeploy tx:  ${deployTx}` }] };
      }

      case "ozc_balance": {
        const { account } = wallet();
        const bal     = await pub.readContract({ address: TOKEN,    abi: TOKEN_ABI,    functionName:"balanceOf",     args:[account.address] });
        const earned  = await pub.readContract({ address: REGISTRY, abi: REGISTRY_ABI, functionName:"creatorEarned", args:[account.address] });
        return { content:[{ type:"text", text: `Wallet: ${account.address}\nOZC balance:    ${formatUnits(bal, 18)}\nCreator earned: ${formatUnits(earned, 18)}` }] };
      }

      default:
        return { content:[{ type:"text", text:`Unknown tool: ${name}` }], isError:true };
    }
  } catch (err) {
    return { content:[{ type:"text", text:`Error: ${err.message}` }], isError:true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
