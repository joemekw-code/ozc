#!/usr/bin/env node
// OZC HTTP Gateway — exposes OZC as a zero-dependency REST API.
// Any agent platform that can POST JSON (ChatGPT Actions, n8n, Zapier, custom bots) can use OZC.
//
// Usage:   OZC_PRIVATE_KEY=0x... node cli/gateway.js     # write-capable
//          node cli/gateway.js                            # read-only
//
// Endpoints:
//   GET  /health
//   GET  /claims                         → list all
//   GET  /claims/:id                     → one claim
//   GET  /balance/:address               → signal balance
//   POST /claim                          → claim faucet (self, needs key)
//   POST /sponsor     { recipient }      → claim for new address
//   POST /back        { id, units }
//   POST /unback      { id, units }
//   POST /publish     { raw, title, description }
//   GET  /openapi.json

import http from "http";
import { createPublicClient, createWalletClient, http as viemHttp, keccak256, toBytes, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { verify } from "./verify.js";

const REGISTRY  = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const TOKEN     = "0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144";
const FAUCET    = "0x9221f6fa294b39a7d9d3e65f1d70ca3cdd760623";
const SPONSORED = "0xea827C90a2ed12afcebBFaF5CBd577c10905222d";
const RPC       = process.env.OZC_RPC  || "https://base-rpc.publicnode.com";
const PORT      = Number(process.env.OZC_PORT || 8787);

const REG_ABI = [
  { name:"nextId",       type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"entries",      type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"bytes32"},{type:"address"},{type:"string"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}] },
  { name:"currentPrice", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"uint256"}] },
  { name:"creatorEarned",type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
  { name:"stake",        type:"function", inputs:[{type:"uint256"},{type:"uint256"}], outputs:[] },
  { name:"unstake",      type:"function", inputs:[{type:"uint256"},{type:"uint256"}], outputs:[] },
  { name:"deploy",       type:"function", inputs:[{type:"bytes32"},{type:"string"},{type:"uint256"}], outputs:[{type:"uint256"}] },
];
const TOK_ABI = [
  { name:"approve",   type:"function", inputs:[{type:"address"},{type:"uint256"}], outputs:[{type:"bool"}] },
  { name:"balanceOf", type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"uint256"}] },
];
const FAU_ABI = [
  { name:"claim",    type:"function", inputs:[],                 outputs:[] },
  { name:"claimFor", type:"function", inputs:[{type:"address"}], outputs:[] },
];

const pub = createPublicClient({ chain: base, transport: viemHttp(RPC) });
let wal = null, account = null;
if (process.env.OZC_PRIVATE_KEY) {
  const key = process.env.OZC_PRIVATE_KEY;
  account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  wal     = createWalletClient({ account, chain: base, transport: viemHttp(RPC) });
}

async function listClaims() {
  const n = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "nextId" });
  const out = [];
  for (let i = 0n; i < n; i++) {
    const e     = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "entries",      args: [i] });
    const price = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "currentPrice", args: [i] });
    let m = {}; try { m = JSON.parse(e[2]); } catch {}
    out.push({ id: Number(i), creator: e[1], title: m.title, description: m.description, claim_type: m.claim_type || null, shareSupply: e[3].toString(), signal: formatUnits(e[4], 18), nextPrice: formatUnits(price, 18) });
  }
  return out;
}

const needKey = (res) => { if (!wal) { res.writeHead(400, { "content-type":"application/json" }); res.end(JSON.stringify({ error: "OZC_PRIVATE_KEY not set in gateway env" })); return true; } return false; };

async function readBody(req) {
  return new Promise(r => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => r(Buffer.concat(c).toString() || "{}")); });
}

const OPENAPI = {
  openapi: "3.1.0",
  info: { title: "OZC Gateway", version: "0.1.0", description: "REST gateway for OZC on Base mainnet." },
  servers: [{ url: `http://localhost:${PORT}` }],
  paths: {
    "/claims":   { get: { summary: "List all claims", responses: { 200: { description: "ok" } } } },
    "/claims/{id}": { get: { summary: "Get one claim", parameters: [{ name:"id", in:"path", required:true, schema:{ type:"integer" } }], responses: { 200: { description:"ok" } } } },
    "/balance/{address}": { get: { summary: "Signal balance for an address", parameters: [{ name:"address", in:"path", required:true, schema:{ type:"string" } }], responses: { 200: { description:"ok" } } } },
    "/claim":   { post: { summary: "Self-claim 100 signal" } },
    "/sponsor": { post: { summary: "Sponsor new address", requestBody: { content: { "application/json": { schema: { type:"object", properties: { recipient: { type:"string" } }, required:["recipient"] } } } } } },
    "/back":    { post: { summary: "Back a claim",  requestBody: { content: { "application/json": { schema: { type:"object", properties: { id:{type:"integer"}, units:{type:"integer"} }, required:["id","units"] } } } } } },
    "/unback":  { post: { summary: "Unback a claim", requestBody: { content: { "application/json": { schema: { type:"object", properties: { id:{type:"integer"}, units:{type:"integer"} }, required:["id","units"] } } } } } },
    "/publish": { post: { summary: "Publish a new claim", requestBody: { content: { "application/json": { schema: { type:"object", properties: { raw:{type:"string"}, title:{type:"string"}, description:{type:"string"} }, required:["raw","title","description"] } } } } } },
  },
};

const server = http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify({ ok: true, chain: "base-mainnet", registry: REGISTRY, writable: !!wal, operator: account?.address || null }));
      return;
    }
    if (url.pathname === "/openapi.json") {
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify(OPENAPI));
      return;
    }
    if (req.method === "GET" && url.pathname === "/oracle") {
      const claim = url.searchParams.get("claim");
      if (!claim) { res.writeHead(400, {"content-type":"application/json"}); res.end(JSON.stringify({error:"claim query param required"})); return; }
      const r = await verify(claim);
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify(r));
      return;
    }
    if (req.method === "GET" && url.pathname === "/claims") {
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify(await listClaims()));
      return;
    }
    const claimOne = url.pathname.match(/^\/claims\/(\d+)$/);
    if (req.method === "GET" && claimOne) {
      const id = BigInt(claimOne[1]);
      const e     = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "entries",      args: [id] });
      const price = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "currentPrice", args: [id] });
      let m = {}; try { m = JSON.parse(e[2]); } catch {}
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify({ id: claimOne[1], creator: e[1], ...m, shareSupply: e[3].toString(), signal: formatUnits(e[4], 18), nextPrice: formatUnits(price, 18) }));
      return;
    }
    const bal = url.pathname.match(/^\/balance\/(0x[0-9a-fA-F]+)$/);
    if (req.method === "GET" && bal) {
      const b = await pub.readContract({ address: TOKEN,    abi: TOK_ABI, functionName: "balanceOf",     args: [bal[1]] });
      const e = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "creatorEarned", args: [bal[1]] });
      res.writeHead(200, { "content-type":"application/json" });
      res.end(JSON.stringify({ address: bal[1], balance: formatUnits(b, 18), creatorEarned: formatUnits(e, 18) }));
      return;
    }

    if (req.method === "POST") {
      const body = JSON.parse(await readBody(req));
      if (url.pathname === "/claim") {
        if (needKey(res)) return;
        const tx = await wal.writeContract({ address: FAUCET, abi: FAU_ABI, functionName: "claim" });
        res.writeHead(200, { "content-type":"application/json" }); res.end(JSON.stringify({ tx })); return;
      }
      if (url.pathname === "/sponsor") {
        if (needKey(res)) return;
        const tx = await wal.writeContract({ address: SPONSORED, abi: FAU_ABI, functionName: "claimFor", args: [body.recipient] });
        res.writeHead(200, { "content-type":"application/json" }); res.end(JSON.stringify({ tx, sponsored: body.recipient })); return;
      }
      if (url.pathname === "/back") {
        if (needKey(res)) return;
        await wal.writeContract({ address: TOKEN,    abi: TOK_ABI, functionName: "approve", args: [REGISTRY, parseUnits("1000000", 18)] });
        const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "stake", args: [BigInt(body.id), BigInt(body.units)] });
        res.writeHead(200, { "content-type":"application/json" }); res.end(JSON.stringify({ tx })); return;
      }
      if (url.pathname === "/unback") {
        if (needKey(res)) return;
        const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "unstake", args: [BigInt(body.id), BigInt(body.units)] });
        res.writeHead(200, { "content-type":"application/json" }); res.end(JSON.stringify({ tx })); return;
      }
      if (url.pathname === "/publish") {
        if (needKey(res)) return;
        await wal.writeContract({ address: TOKEN, abi: TOK_ABI, functionName: "approve", args: [REGISTRY, parseUnits("1000000", 18)] });
        const hash = keccak256(toBytes(body.raw));
        const meta = JSON.stringify({ title: body.title, description: body.description });
        const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "deploy", args: [hash, meta, 1n] });
        res.writeHead(200, { "content-type":"application/json" }); res.end(JSON.stringify({ tx, hash })); return;
      }
    }

    res.writeHead(404, { "content-type":"application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  } catch (err) {
    res.writeHead(500, { "content-type":"application/json" });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`OZC gateway listening on :${PORT}`);
  console.log(`  writable: ${!!wal}${account ? `  operator: ${account.address}` : ""}`);
  console.log(`  openapi : http://localhost:${PORT}/openapi.json`);
});
