#!/usr/bin/env node
// Farcaster 投稿スクリプト
//
// Farcaster は wallet-native SNS。投稿(cast)には FID が必要。
// 本スクリプトは「credentials があれば即 post」形式で、3つの経路をサポート。
//
// --- 前提調査（2026-04 時点、本リポジトリ wallet 0xB8E5...1d0f） ---
//   - FID 登録状態: 未登録 (idOf = 0)
//   - OP Mainnet ETH: 0   (Base/ETH/Arb も 0)
//   - FID 登録費: IdGateway.price() ≒ 0.0000853 ETH (≒$0.30) + key 登録 gas
//     → $5 ではなかった。ただしトランザクション署名用 ETH (OP) が必要。
//   - 現状の wallet では OP に bridge しないと onchain 登録不可。
//
// --- 経路 ---
//
// A. 既存 Warpcast アカウント (最速・無料):
//    Warpcast に wallet で sign-in 済みアカウントがあれば cookie 経由で post。
//    必要: FC_WARPCAST_COOKIE   (warpcast.com にログインした状態の cookie string、
//          もしくは Authorization ヘッダー用 bearer token)
//    → docs では Warpcast が公式クライアント。ブラウザ自動化 fallback も下に用意。
//
// B. Neynar managed signer (推奨・月$0 tier あり):
//    1. https://neynar.com でサインアップ (email のみ、wallet不要)
//    2. Dashboard で API key 発行
//    3. Managed signer を作成 → QR で Warpcast から approve (自分のアカウントで)
//       ※ この approve 操作で既存 FID を使うので、自分の Warpcast があればOK
//    4. FC_NEYNAR_API_KEY + FC_NEYNAR_SIGNER_UUID で cast POST
//    必要: FC_NEYNAR_API_KEY, FC_NEYNAR_SIGNER_UUID
//
// C. Self-hosted onchain registration (wallet-native, full decentralized):
//    OP Mainnet の IdGateway.register() + KeyGateway.add() を自分で呼ぶ。
//    必要: OP に ~0.0002 ETH の wallet、private key, Ed25519 signer 生成
//    → 本スクリプトでは dry-run のみ (wallet が空のため実行できない)。
//    → funding 後に `node launch/auto/farcaster.js --register` で実行可。
//
// --- 実行例 ---
//
//   # B: Neynar (現実的な first path)
//   FC_NEYNAR_API_KEY=... FC_NEYNAR_SIGNER_UUID=... node launch/auto/farcaster.js
//
//   # A: Warpcast cookie
//   FC_WARPCAST_COOKIE="<cookie>" node launch/auto/farcaster.js
//
//   # C: Onchain FID registration dry-run
//   node launch/auto/farcaster.js --register --dry-run
//
//   # Onchain 実登録 (wallet に OP ETH 必要)
//   FC_PRIVKEY=0x... node launch/auto/farcaster.js --register
//
// --- 投稿本文 ---
//
// デフォルト:
//   "OZC: a market for information trust, detached from authority and money.
//    Agents back claims they believe; the distribution of conviction filters truth.
//    https://github.com/joemekw-code/ozc"
// 上書き: FC_TEXT 環境変数

import { readFileSync, existsSync } from "fs";

const TEXT = process.env.FC_TEXT ||
  "OZC: a market for information trust, detached from authority and money. Agents back claims they believe; the distribution of conviction filters truth. https://github.com/joemekw-code/ozc";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const REGISTER = args.has("--register");

// --- Path B: Neynar API ---
async function postViaNeynar() {
  const key = process.env.FC_NEYNAR_API_KEY;
  const signer = process.env.FC_NEYNAR_SIGNER_UUID;
  if (!key || !signer) return null;
  console.log("[fc] path: Neynar");
  if (DRY_RUN) { console.log("[fc] (dry-run) would POST:", TEXT); return true; }
  const res = await fetch("https://api.neynar.com/v2/farcaster/cast", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify({ signer_uuid: signer, text: TEXT }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error("[fc] Neynar error", res.status, body);
    return false;
  }
  console.log("[fc] cast posted via Neynar:", body);
  return true;
}

// --- Path A: Warpcast via browser automation ---
async function postViaWarpcast() {
  const cookie = process.env.FC_WARPCAST_COOKIE;
  if (!cookie) return null;
  console.log("[fc] path: Warpcast cookie automation");
  if (DRY_RUN) { console.log("[fc] (dry-run) would POST to warpcast.com:", TEXT); return true; }
  // Playwright ブラウザ投稿 (X と同じ pattern)。
  // cookie string から parse して session を復元。
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  // cookie header を parse: "name=val; name=val" 形式を期待
  const pairs = cookie.split(";").map(s => s.trim()).filter(Boolean).map(p => {
    const eq = p.indexOf("=");
    return { name: p.slice(0, eq), value: p.slice(eq + 1), domain: ".warpcast.com", path: "/", secure: true };
  });
  await ctx.addCookies(pairs);
  const page = await ctx.newPage();
  try {
    await page.goto("https://warpcast.com/~/compose");
    await page.waitForTimeout(3000);
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.fill(TEXT);
    console.log("[fc] 15秒後に送信。Ctrl+C で中断可。");
    await page.waitForTimeout(15000);
    await page.locator('button:has-text("Cast")').first().click();
    await page.waitForTimeout(5000);
    console.log("[fc] posted:", page.url());
    return true;
  } catch (e) {
    console.error("[fc] warpcast error:", e.message);
    return false;
  } finally {
    await browser.close();
  }
}

// --- Path C: Onchain FID registration (dry-run-first) ---
async function registerOnchain() {
  console.log("[fc] path: Onchain FID registration on OP Mainnet");
  const { createPublicClient, createWalletClient, http, formatEther, parseEther } = await import("viem");
  const { optimism } = await import("viem/chains");
  const { privateKeyToAccount } = await import("viem/accounts");

  const WALLET_ADDR = "0xB8E5dDB2f5FC9DCF93c6F9A22Ab109f14A981d0f";
  const ID_REGISTRY = "0x00000000Fc6c5F01Fc30151999387Bb99A9f489b";
  const ID_GATEWAY  = "0x00000000Fc25870C6eD6b6c7E41Fb078b7656f69";
  const KEY_GATEWAY = "0x00000000fC56947c7E7183f8Ca4B62398CaAdf0B";

  const pub = createPublicClient({ chain: optimism, transport: http("https://mainnet.optimism.io") });
  const [fid, price, bal] = await Promise.all([
    pub.readContract({ address: ID_REGISTRY, abi: [{ name: "idOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] }], functionName: "idOf", args: [WALLET_ADDR] }),
    pub.readContract({ address: ID_GATEWAY, abi: [{ name: "price", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] }], functionName: "price" }),
    pub.getBalance({ address: WALLET_ADDR }),
  ]);
  console.log(`[fc] current FID of ${WALLET_ADDR}: ${fid}`);
  console.log(`[fc] registration price: ${formatEther(price)} ETH`);
  console.log(`[fc] OP wallet balance:   ${formatEther(bal)} ETH`);
  if (fid !== 0n) { console.log("[fc] already registered. skip."); return true; }

  const needed = price * 3n; // fee + ~2x gas headroom
  if (bal < needed) {
    console.error(`[fc] insufficient OP ETH. need ~${formatEther(needed)} ETH, have ${formatEther(bal)}.`);
    console.error(`[fc] fund ${WALLET_ADDR} on Optimism Mainnet, then retry.`);
    if (!DRY_RUN) return false;
  }
  if (DRY_RUN) { console.log("[fc] dry-run finished."); return true; }

  const pk = process.env.FC_PRIVKEY;
  if (!pk) { console.error("[fc] FC_PRIVKEY not set."); return false; }
  const account = privateKeyToAccount(pk);
  if (account.address.toLowerCase() !== WALLET_ADDR.toLowerCase())
    console.warn(`[fc] WARN: FC_PRIVKEY address ${account.address} != expected ${WALLET_ADDR}`);

  const wallet = createWalletClient({ account, chain: optimism, transport: http("https://mainnet.optimism.io") });
  // register(recovery) — recovery は自分自身を指定 (migration可)
  const hash = await wallet.writeContract({
    address: ID_GATEWAY,
    abi: [{ name: "register", type: "function", stateMutability: "payable", inputs: [{ name: "recovery", type: "address" }], outputs: [{ name: "fid", type: "uint256" }, { name: "overpayment", type: "uint256" }] }],
    functionName: "register",
    args: [account.address],
    value: price,
  });
  console.log("[fc] register tx:", hash);
  const rcpt = await pub.waitForTransactionReceipt({ hash });
  console.log("[fc] registered. block", rcpt.blockNumber);
  console.log("[fc] NOTE: next step = add Ed25519 signer via KeyGateway.add().");
  console.log("[fc]       see https://docs.farcaster.xyz/developers/guides/accounts/create-account");
  return true;
}

// --- entry ---
(async () => {
  if (REGISTER) {
    const ok = await registerOnchain();
    process.exit(ok ? 0 : 1);
  }
  // Try Neynar → Warpcast → Neynar dry-run
  for (const fn of [postViaNeynar, postViaWarpcast]) {
    const r = await fn();
    if (r === true) process.exit(0);
    if (r === false) process.exit(1);
  }
  console.error(`[fc] no credentials provided. one of:
    FC_NEYNAR_API_KEY + FC_NEYNAR_SIGNER_UUID   (Neynar, free tier, recommended)
    FC_WARPCAST_COOKIE                          (cookie from warpcast.com)
    FC_PRIVKEY with --register                  (onchain, needs OP ETH)

  See header comment of this file for full setup.`);
  process.exit(2);
})();
