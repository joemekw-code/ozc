#!/usr/bin/env node
// OZC unified CLI.
// Usage:
//   npx github:joemekw-code/ozc list
//   npx github:joemekw-code/ozc info <id>
//   npx github:joemekw-code/ozc verify "<claim text>"
//   npx github:joemekw-code/ozc balance [address]
//   npx github:joemekw-code/ozc claim                          (needs OZC_PRIVATE_KEY)
//   npx github:joemekw-code/ozc sponsor <recipientAddress>     (needs OZC_PRIVATE_KEY)
//   npx github:joemekw-code/ozc back <id> <units>              (needs OZC_PRIVATE_KEY)
//   npx github:joemekw-code/ozc unback <id> <units>            (needs OZC_PRIVATE_KEY)
//   npx github:joemekw-code/ozc publish <raw> <title> <desc>   (needs OZC_PRIVATE_KEY)

import { createPublicClient, createWalletClient, http, keccak256, toBytes, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const REGISTRY  = "0x3ca993e7183824e11b2a65cf183b4c3521bf4754";
const TOKEN     = "0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144";
const FAUCET    = "0x9221f6fa294b39a7d9d3e65f1d70ca3cdd760623";
const SPONSORED = "0xea827C90a2ed12afcebBFaF5CBd577c10905222d";
const RPC       = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const REG_ABI = [
  { name:"nextId",       type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"entries",      type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"bytes32"},{type:"address"},{type:"string"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}] },
  { name:"currentPrice", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"uint256"}] },
  { name:"shares",       type:"function", stateMutability:"view", inputs:[{type:"uint256"},{type:"address"}], outputs:[{type:"uint256"}] },
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
  { name:"claim",     type:"function", inputs:[],                 outputs:[] },
  { name:"claimFor",  type:"function", inputs:[{type:"address"}], outputs:[] },
  { name:"claimed",   type:"function", stateMutability:"view", inputs:[{type:"address"}], outputs:[{type:"bool"}] },
];

const pub = createPublicClient({ chain: base, transport: http(RPC) });

function signer() {
  const key = process.env.OZC_PRIVATE_KEY;
  if (!key) { console.error("Set OZC_PRIVATE_KEY env to use write commands."); process.exit(1); }
  const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
  const wal     = createWalletClient({ account, chain: base, transport: http(RPC) });
  return { wal, account };
}

const [, , cmd, ...args] = process.argv;

async function main() {
  switch (cmd) {
    case "list": {
      const n = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "nextId" });
      const out = [];
      for (let i = 0n; i < n; i++) {
        const e     = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "entries",      args: [i] });
        const price = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "currentPrice", args: [i] });
        let m = {}; try { m = JSON.parse(e[2]); } catch {}
        out.push({ id: Number(i), title: m.title, claim_type: m.claim_type || null, signal: formatUnits(e[4], 18), next: formatUnits(price, 18), supply: e[3].toString() });
      }
      console.table(out);
      return;
    }
    case "boost": {
      // boost any URL or string identifier with ETH via URLValuation bonding curve
      const { wal } = signer();
      const identifier = args[0];
      const shares = BigInt(args[1] || "1");
      const UV = "0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd";
      const UV_ABI = [
        { name:"buyByString", type:"function", stateMutability:"payable", inputs:[{type:"string"},{type:"uint256"}], outputs:[] },
        { name:"buyPriceNext", type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
      ];
      // estimate cost upper bound: n shares, assume high buffer
      const estimate = shares * parseUnits("0.00001", 18); // 10 µETH per share safe upper bound for small n
      const tx = await wal.writeContract({ address: UV, abi: UV_ABI, functionName:"buyByString", args:[identifier, shares], value: estimate });
      console.log(`Boosted "${identifier}" with ${shares} share(s).  tx: ${tx}`);
      return;
    }
    case "unboost": {
      const { wal } = signer();
      const identifier = args[0];
      const shares = BigInt(args[1] || "1");
      const { keccak256: kek, toBytes: tb } = await import("viem");
      const id = kek(tb(identifier));
      const UV = "0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd";
      const UV_ABI = [{ name:"sell", type:"function", inputs:[{type:"bytes32"},{type:"uint256"}], outputs:[] }];
      const tx = await wal.writeContract({ address: UV, abi: UV_ABI, functionName:"sell", args:[id, shares] });
      console.log(`Released ${shares} share(s) of "${identifier}".  tx: ${tx}`);
      return;
    }
    case "rank": {
      const identifier = args[0];
      const { keccak256: kek, toBytes: tb } = await import("viem");
      const id = kek(tb(identifier));
      const UV = "0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd";
      const UV_ABI = [
        { name:"shareSupply", type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
        { name:"reserve",     type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
        { name:"buyPriceNext",type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
      ];
      const [supply, reserve, next] = await Promise.all([
        pub.readContract({ address: UV, abi: UV_ABI, functionName:"shareSupply", args:[id] }),
        pub.readContract({ address: UV, abi: UV_ABI, functionName:"reserve",     args:[id] }),
        pub.readContract({ address: UV, abi: UV_ABI, functionName:"buyPriceNext",args:[id] }),
      ]);
      console.log(JSON.stringify({
        identifier, id,
        shares: supply.toString(),
        committedETH: formatUnits(reserve, 18),
        nextBuyPrice: formatUnits(next, 18),
      }, null, 2));
      return;
    }
    case "commit": {
      const { wal } = signer();
      const id = BigInt(args[0]);
      const eth = args[1]; // "0.000001" 等
      if (!id && id !== 0n) { console.error("Usage: ozc commit <id> <eth_amount>"); process.exit(1); }
      const wei = parseUnits(eth, 18);
      const CV = "0x675d23f2e14ee862846e375ba385eae567d5d985";
      const CV_ABI = [{ name:"commit", type:"function", stateMutability:"payable", inputs:[{type:"uint256"}], outputs:[] }];
      const tx = await wal.writeContract({ address: CV, abi: CV_ABI, functionName:"commit", args:[id], value: wei });
      console.log(`Committed ${eth} ETH to claim #${args[0]}.  tx: ${tx}`);
      return;
    }
    case "valuation": {
      const id = BigInt(args[0]);
      const CV = "0x675d23f2e14ee862846e375ba385eae567d5d985";
      const CV_ABI = [{ name:"valuationETH", type:"function", stateMutability:"view", inputs:[{type:"uint256"}], outputs:[{type:"uint256"}] }];
      const v = await pub.readContract({ address: CV, abi: CV_ABI, functionName:"valuationETH", args:[id] });
      console.log(`#${args[0]} valuationETH: ${formatUnits(v, 18)} ETH`);
      return;
    }
    case "timeline": {
      const { timeline } = await import("./timeline.js");
      const addr = args[0];
      if (!addr) { console.error("Usage: ozc timeline <address>"); process.exit(1); }
      const t = await timeline(addr);
      console.log(JSON.stringify(t, null, 2));
      return;
    }
    case "verify": {
      const { verify } = await import("./verify.js");
      const claim = args.join(" ");
      if (!claim) { console.error("Usage: ozc verify \"<claim text>\""); process.exit(1); }
      const r = await verify(claim);
      if (r.exactMatch) {
        console.log(`EXACT MATCH: claim already on OZC as #${r.exactMatch.id}`);
        console.log(`  signal backing: ${r.exactMatch.signal}  supply: ${r.exactMatch.supply}`);
      } else {
        console.log(`No exact match. keccak256: ${r.exactHash}`);
      }
      if (r.similar.length) {
        console.log(`\n${r.similar.length} near-duplicate(s):`);
        for (const s of r.similar) console.log(`  #${s.id}  sim=${s.similarity}  signal=${s.signal}  "${s.title}"`);
      } else if (!r.exactMatch) {
        console.log("No similar claim found. You could publish this as new.");
      }
      return;
    }
    case "info": {
      const id = BigInt(args[0]);
      const e     = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "entries",      args: [id] });
      const price = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "currentPrice", args: [id] });
      let m = {}; try { m = JSON.parse(e[2]); } catch {}
      console.log(JSON.stringify({ id: args[0], hash: e[0], creator: e[1], ...m, shareSupply: e[3].toString(), signal: formatUnits(e[4], 18), nextPrice: formatUnits(price, 18) }, null, 2));
      return;
    }
    case "balance": {
      const addr = args[0] || signer().account.address;
      const b = await pub.readContract({ address: TOKEN,    abi: TOK_ABI, functionName: "balanceOf",     args: [addr] });
      const e = await pub.readContract({ address: REGISTRY, abi: REG_ABI, functionName: "creatorEarned", args: [addr] });
      console.log(`${addr}\n  balance:       ${formatUnits(b, 18)} signal\n  creator earn:  ${formatUnits(e, 18)} signal`);
      return;
    }
    case "claim": {
      const { wal, account } = signer();
      const already = await pub.readContract({ address: FAUCET, abi: FAU_ABI, functionName:"claimed", args:[account.address] });
      if (already) { console.log(`Already claimed: ${account.address}`); return; }
      const tx = await wal.writeContract({ address: FAUCET, abi: FAU_ABI, functionName: "claim" });
      console.log(`Claimed 100 signal.  tx: ${tx}`);
      return;
    }
    case "sponsor": {
      const recipient = args[0];
      const { wal } = signer();
      const tx = await wal.writeContract({ address: SPONSORED, abi: FAU_ABI, functionName: "claimFor", args: [recipient] });
      console.log(`Sponsored ${recipient}.  tx: ${tx}`);
      return;
    }
    case "back": {
      const { wal } = signer();
      await wal.writeContract({ address: TOKEN,    abi: TOK_ABI, functionName: "approve", args: [REGISTRY, parseUnits("1000000", 18)] });
      const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "stake", args: [BigInt(args[0]), BigInt(args[1])] });
      console.log(`Backed entry #${args[0]} with ${args[1]} units.  tx: ${tx}`);
      return;
    }
    case "unback": {
      const { wal } = signer();
      const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "unstake", args: [BigInt(args[0]), BigInt(args[1])] });
      console.log(`Unbacked entry #${args[0]} by ${args[1]} units.  tx: ${tx}`);
      return;
    }
    case "publish": {
      const [raw, title, desc] = args;
      const { wal } = signer();
      await wal.writeContract({ address: TOKEN, abi: TOK_ABI, functionName: "approve", args: [REGISTRY, parseUnits("1000000", 18)] });
      const hash = keccak256(toBytes(raw));
      const meta = JSON.stringify({ title, description: desc });
      const tx = await wal.writeContract({ address: REGISTRY, abi: REG_ABI, functionName: "deploy", args: [hash, meta, 1n] });
      console.log(`Claim published.\n  hash: ${hash}\n  tx:   ${tx}`);
      return;
    }
    default:
      console.log(`Usage:
  ozc list                                Show all claims
  ozc info <id>                           Show one claim
  ozc balance [address]                   Show signal balance + creator earnings
  ozc claim                               Receive 100 signal (one-time per wallet)
  ozc sponsor <recipient>                 Give 100 signal to a new wallet (you pay gas)
  ozc back <id> <units>                   Back a claim
  ozc unback <id> <units>                 Withdraw backing
  ozc publish <raw> <title> <desc>        Publish a new claim
Environment:
  OZC_PRIVATE_KEY   required for write commands
  OZC_RPC           optional override (default: base publicnode)`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
