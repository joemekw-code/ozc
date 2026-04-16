#!/usr/bin/env node
// `ozc save <url>` — いいなと思ったものを1コマンドでOZCに刻む。
//
// 使い方:
//   ozc save "https://youtube.com/watch?v=xxx"
//   ozc save "https://open.spotify.com/track/xxx"
//   ozc save "https://twitter.com/someone/status/123"
//   ozc save "https://example.com/article" "自分のメモ（任意）"
//
// 自動で:
//   1. URL のタイトル/説明を取得（可能なら）
//   2. AI memo を生成
//   3. OzIndexFinal に add (OZC lock)
//   4. 完了

import { createPublicClient, createWalletClient, http, keccak256, toBytes, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const IDX   = "0x7e846cfe52c2c5118a1d7f132c3212a21500889f";
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
const TOK_ABI = [
  { name:"approve",   type:"function", inputs:[{type:"address"},{type:"uint256"}], outputs:[{type:"bool"}] },
  { name:"allowance", type:"function", stateMutability:"view", inputs:[{type:"address"},{type:"address"}], outputs:[{type:"uint256"}] },
];

const key = process.env.OZC_PRIVATE_KEY;
if (!key) { console.error("OZC_PRIVATE_KEY を設定してください"); process.exit(1); }
const account = privateKeyToAccount(key.startsWith("0x") ? key : `0x${key}`);
const pub = createPublicClient({ chain: base, transport: http(RPC) });
const wal = createWalletClient({ account, chain: base, transport: http(RPC) });

const [, , url, ...memoParts] = process.argv;
if (!url) {
  console.log(`使い方: ozc save <url> [メモ]

  例:
    ozc save "https://youtube.com/watch?v=dQw4w9WgXcQ"
    ozc save "https://open.spotify.com/track/xxx" "最高の曲"
    ozc save "https://x.com/someone/status/123" "この視点は新しい"
    ozc save "https://arxiv.org/abs/2401.xxxxx" "attention 論文の決定版"
  `);
  process.exit(0);
}

const userMemo = memoParts.join(" ");

// ── 1. URL からタイトルを自動取得（失敗しても続行）──
let autoTitle = "";
try {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow", signal: AbortSignal.timeout(5000) });
  const html = await res.text();
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) autoTitle = m[1].trim().slice(0, 200);
} catch {}

// ── 2. memo 組み立て ──
const memo = userMemo
  || (autoTitle ? `${autoTitle}` : url.slice(0, 100));

console.log(`\n  URL:  ${url}`);
console.log(`  memo: ${memo}`);

// ── 3. 重複チェック ──
const k = await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "keyOf", args: [url] });
const existing = await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "entries", args: [k] });
if (existing[6]) { // exists = true
  console.log(`\n  既に index にあります。back で OZC をかけることはできます。`);
  console.log(`  ozc back ${k} <amount>`);
  process.exit(0);
}

// ── 4. approve 確認 ──
const fee = await pub.readContract({ address: IDX, abi: IDX_ABI, functionName: "currentFee" });
console.log(`  fee:  ${formatUnits(fee, 18)} OZC`);

const allowance = await pub.readContract({ address: TOKEN, abi: TOK_ABI, functionName: "allowance", args: [account.address, IDX] });
if (allowance < fee) {
  console.log("  approving...");
  await wal.writeContract({ address: TOKEN, abi: TOK_ABI, functionName: "approve", args: [IDX, BigInt("999999999000000000000000000")] });
}

// ── 5. add ──
console.log("  saving...");
const tx = await wal.writeContract({ address: IDX, abi: IDX_ABI, functionName: "add", args: [url, memo] });
console.log(`\n  ✓ saved!  tx: ${tx}\n`);
