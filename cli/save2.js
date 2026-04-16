#!/usr/bin/env node
// `ozc save <url> [memo]` — v2: saves to OzIndexFinal (memo) + buys shares on URLValuation (bonding curve)
//
// Two things happen in one command:
//   1. If not indexed yet → add to OzIndexFinal (locks OZC for slot)
//   2. Buy shares on URLValuation bonding curve (price goes up, early = cheap)
//
// Later: `ozc sell <url> <shares>` to realize gain if others followed.

import { createPublicClient, createWalletClient, http, keccak256, toBytes, formatUnits, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const IDX   = "0x7e846cfe52c2c5118a1d7f132c3212a21500889f";
const UV    = "0x4bc0a3335b37a2ce6acfbba7c4b274a29d7463fd";
const TOKEN = "0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144";
const RPC   = process.env.OZC_RPC || "https://base-rpc.publicnode.com";

const IDX_ABI = [
  { name:"add",        type:"function", inputs:[{type:"string"},{type:"string"}], outputs:[{type:"bytes32"}] },
  { name:"currentFee", type:"function", stateMutability:"view", inputs:[], outputs:[{type:"uint256"}] },
  { name:"keyOf",      type:"function", stateMutability:"pure", inputs:[{type:"string"}], outputs:[{type:"bytes32"}] },
  { name:"entries",    type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[
    {type:"string"},{type:"string"},{type:"address"},{type:"uint256"},{type:"uint256"},{type:"uint256"},{type:"bool"}
  ]},
];
const UV_ABI = [
  { name:"buyByString", type:"function", stateMutability:"payable", inputs:[{type:"string"},{type:"uint256"}], outputs:[] },
  { name:"shareSupply", type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
  { name:"reserve",     type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
  { name:"buyPriceNext",type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
  { name:"sell",        type:"function", inputs:[{type:"bytes32"},{type:"uint256"}], outputs:[] },
  { name:"sharesOf",    type:"function", stateMutability:"view", inputs:[{type:"bytes32"},{type:"address"}], outputs:[{type:"uint256"}] },
  { name:"sellPriceOne",type:"function", stateMutability:"view", inputs:[{type:"bytes32"}], outputs:[{type:"uint256"}] },
];
const TOK_ABI = [
  { name:"approve",   type:"function", inputs:[{type:"address"},{type:"uint256"}], outputs:[{type:"bool"}] },
  { name:"allowance", type:"function", stateMutability:"view", inputs:[{type:"address"},{type:"address"}], outputs:[{type:"uint256"}] },
];

const key = process.env.OZC_PRIVATE_KEY;
if (!key) { console.error("OZC_PRIVATE_KEY を設定してください"); process.exit(1); }
const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const pub = createPublicClient({ chain: base, transport: http(RPC) });
const wal = createWalletClient({ account, chain: base, transport: http(RPC) });

const [, , cmd, ...args] = process.argv;

if (cmd === "sell") {
  // ozc save sell <url> <shares>
  const [url, sharesStr] = args;
  const id = keccak256(toBytes(url));
  const shares = BigInt(sharesStr || "1");
  const sellPrice = await pub.readContract({ address: UV, abi: UV_ABI, functionName: "sellPriceOne", args: [id] });
  console.log(`\n  売却: ${url}`);
  console.log(`  1 share sell price: ${formatUnits(sellPrice, 18)} ETH`);
  console.log(`  selling ${shares} share(s)...`);
  const tx = await wal.writeContract({ address: UV, abi: UV_ABI, functionName: "sell", args: [id, shares] });
  console.log(`  ✓ sold!  tx: ${tx}\n`);
  process.exit(0);
}

// Default: save (index + buy shares)
const url = cmd;
const userMemo = args.join(" ");
if (!url) {
  console.log(`
  使い方:
    ozc save2 <url> [memo]         — 情報を保存 + bonding curve で shares 購入
    ozc save2 sell <url> <shares>   — shares を売却（値上がりしていれば利益）

  例:
    ozc save2 "https://youtube.com/watch?v=xxx" "最高の曲"
    ozc save2 sell "https://youtube.com/watch?v=xxx" 1
  `);
  process.exit(0);
}

// ── 1. タイトル取得 ──
let autoTitle = "";
try {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow", signal: AbortSignal.timeout(5000) });
  const html = await res.text();
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) autoTitle = m[1].trim().slice(0, 200);
} catch {}

const memo = userMemo || autoTitle || url.slice(0, 100);
const id = keccak256(toBytes(url));

// ── 2. OzIndex チェック＋追加 ──
const existing = await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "entries", args: [await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "keyOf", args: [url] })] });
const alreadyIndexed = existing[6]; // exists

if (!alreadyIndexed) {
  console.log(`\n  新規 index 登録...`);
  const fee = await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "currentFee" });
  const allowance = await pub.readContract({ address: TOKEN, abi: TOK_ABI, functionName: "allowance", args: [account.address, IDX] });
  if (allowance < fee) {
    await wal.writeContract({ address: TOKEN, abi: TOK_ABI, functionName: "approve", args: [IDX, BigInt("999999999000000000000000000")] });
  }
  await wal.writeContract({ address: IDX, abi: IDX_ABI, functionName: "add", args: [url, memo] });
  console.log(`  ✓ indexed: "${memo.slice(0, 60)}"`);
}

// ── 3. URLValuation で shares 購入（bonding curve） ──
const currentPrice = await pub.readContract({ address: UV, abi: UV_ABI, functionName: "buyPriceNext", args: [id] });
const supply = await pub.readContract({ address: UV, abi: UV_ABI, functionName: "shareSupply", args: [id] });
console.log(`\n  URL:     ${url}`);
console.log(`  memo:    ${memo.slice(0, 80)}`);
console.log(`  現在:    ${supply} shares outstanding`);
console.log(`  今の1 share: ${formatUnits(currentPrice, 18)} ETH`);

// buy 1 share (send enough ETH to cover)
const costEstimate = currentPrice * 2n; // buffer
console.log(`  1 share 購入中...`);
const tx = await wal.writeContract({ address: UV, abi: UV_ABI, functionName: "buyByString", args: [url, 1n], value: costEstimate });

const newSupply = await pub.readContract({ address: UV, abi: UV_ABI, functionName: "shareSupply", args: [id] });
const newPrice = await pub.readContract({ address: UV, abi: UV_ABI, functionName: "buyPriceNext", args: [id] });
console.log(`\n  ✓ saved!  tx: ${tx}`);
console.log(`  shares: ${newSupply}  次の1 share: ${formatUnits(newPrice, 18)} ETH`);
console.log(`  → 他の人が後から save すると、あなたの share の価値が上がる\n`);
