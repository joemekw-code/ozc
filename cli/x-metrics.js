#!/usr/bin/env node
// X (Twitter) engagement metrics collector
//
// 我々のXアカウント profile にアクセスし、最新ピン留め or 直近投稿の
// engagement (views / likes / retweets / replies) を取得して
// metrics/x-history.jsonl に追記する。
//
// cron-friendly: 1回実行して exit する。
//
// 必要な環境変数:
//   X_COOKIE_AUTH_TOKEN - x.comにログインした状態のauth_token cookie
//   X_COOKIE_CT0        - ct0 cookie
//
// オプション:
//   X_HANDLE            - 自分のhandle (default: joemekw_code を試す。不明なら home を使う)
//   X_METRICS_OUT       - 出力先 jsonl (default: metrics/x-history.jsonl)
//   X_METRICS_HEADLESS  - headless mode (default: true)
//   X_TARGET_POST_ID    - 特定の投稿を追う場合 (default: 最新)
//
// 実行:
//   X_COOKIE_AUTH_TOKEN=... X_COOKIE_CT0=... node cli/x-metrics.js

import { chromium } from "playwright";
import { appendFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";

const OUT = process.env.X_METRICS_OUT || "metrics/x-history.jsonl";
const HEADLESS = process.env.X_METRICS_HEADLESS !== "false";
const HANDLE = process.env.X_HANDLE || "";
const TARGET = process.env.X_TARGET_POST_ID || "";

if (!process.env.X_COOKIE_AUTH_TOKEN || !process.env.X_COOKIE_CT0) {
  console.error("[x-metrics] 環境変数不足: X_COOKIE_AUTH_TOKEN, X_COOKIE_CT0");
  process.exit(1);
}

// aria-label から数値を抽出するヘルパ。
// "1,234" -> 1234, "1.2K" -> 1200, "3.4M" -> 3400000
function parseNum(s) {
  if (!s) return 0;
  const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = (m[2] || "").toUpperCase();
  if (u === "K") return Math.round(n * 1e3);
  if (u === "M") return Math.round(n * 1e6);
  if (u === "B") return Math.round(n * 1e9);
  return Math.round(n);
}

async function extractMetrics(page, article) {
  // article内から testid 付きボタンの aria-label を読む
  const get = async (testid) => {
    try {
      const el = await article.locator(`[data-testid="${testid}"]`).first();
      const label = await el.getAttribute("aria-label");
      return parseNum(label || "");
    } catch { return 0; }
  };
  const replies = await get("reply");
  const retweets = await get("retweet");
  const likes = await get("like");
  // views: analytics link の aria-label に含まれる
  let views = 0;
  try {
    const analytics = await article.locator('a[href*="/analytics"]').first();
    const label = await analytics.getAttribute("aria-label");
    views = parseNum(label || "");
  } catch {}
  // post_id: status link
  let postId = "";
  try {
    const statusLink = await article.locator('a[href*="/status/"]').first();
    const href = await statusLink.getAttribute("href");
    const m = href && href.match(/\/status\/(\d+)/);
    if (m) postId = m[1];
  } catch {}
  return { postId, views, likes, retweets, replies };
}

async function run() {
  const browser = await chromium.launch({ headless: HEADLESS });
  const ctx = await browser.newContext();
  await ctx.addCookies([
    { name: "auth_token", value: process.env.X_COOKIE_AUTH_TOKEN, domain: ".x.com", path: "/", httpOnly: true, secure: true },
    { name: "ct0",        value: process.env.X_COOKIE_CT0,        domain: ".x.com", path: "/", secure: true },
  ]);
  const page = await ctx.newPage();

  try {
    let url;
    if (TARGET) {
      url = `https://x.com/i/status/${TARGET}`;
    } else if (HANDLE) {
      url = `https://x.com/${HANDLE}`;
    } else {
      // 自分のprofileへ。home の左メニューの Profile リンクを叩く代わりに
      // settings経由で screen_name を取ることもできるが、シンプルに home から最新tweetを取る
      url = "https://x.com/home";
    }
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    // profile or status ページなら最初の article が対象投稿
    const article = await page.locator('article[data-testid="tweet"]').first();
    await article.waitFor({ timeout: 15000 });

    const m = await extractMetrics(page, article);
    const record = {
      timestamp: new Date().toISOString(),
      post_id: m.postId,
      views: m.views,
      likes: m.likes,
      retweets: m.retweets,
      replies: m.replies,
      source_url: page.url(),
    };

    const outPath = resolve(OUT);
    if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
    appendFileSync(outPath, JSON.stringify(record) + "\n");

    console.log(`[x-metrics] ${record.timestamp} post=${record.post_id} views=${record.views} likes=${record.likes} RT=${record.retweets} replies=${record.replies}`);
    await browser.close();
    return 0;
  } catch (e) {
    console.error("[x-metrics] エラー:", e.message);
    await browser.close();
    return 1;
  }
}

process.exit(await run());
