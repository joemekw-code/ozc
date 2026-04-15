#!/usr/bin/env node
// Hacker News "Show HN" 自動投稿スクリプト（Playwright）
// HNにはAPIがないためブラウザ自動化で対応。
//
// 必要な環境変数:
//   HN_USER  - ユーザー名
//   HN_PASS  - パスワード
// オプション:
//   HN_TITLE - デフォルト: "Show HN: OZC – ..."
//   HN_URL   - デフォルト: https://github.com/joemekw-code/ozc
//   HN_TEXT  - 本文（任意）
//
// 実行:
//   HN_USER=xxx HN_PASS=yyy node launch/auto/hn.js

import { chromium } from "playwright";

const USER  = process.env.HN_USER;
const PASS  = process.env.HN_PASS;
const TITLE = process.env.HN_TITLE || "Show HN: OZC – detaching information trust from authority";
const URL   = process.env.HN_URL   || "https://github.com/joemekw-code/ozc";
const TEXT  = process.env.HN_TEXT  || "";

if (!USER || !PASS) {
  console.error("HN_USER / HN_PASS が未設定です。");
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });  // 投稿確認のため可視モード
const page    = await browser.newPage();

try {
  await page.goto("https://news.ycombinator.com/login");
  await page.fill('input[name="acct"]', USER);
  await page.fill('input[name="pw"]', PASS);
  await Promise.all([
    page.waitForNavigation(),
    page.click('input[type="submit"]'),
  ]);

  if ((await page.content()).includes("Bad login")) {
    throw new Error("ログイン失敗 — HN_USER/HN_PASS を確認してください");
  }
  console.log("[hn] ログイン成功");

  await page.goto("https://news.ycombinator.com/submit");
  await page.fill('input[name="title"]', TITLE);
  if (URL)  await page.fill('input[name="url"]',  URL);
  if (TEXT) await page.fill('textarea[name="text"]', TEXT);

  console.log("[hn] 30秒後に送信。間違いがあれば Ctrl+C で中断してください。");
  await page.waitForTimeout(30000);
  await page.click('input[type="submit"]');
  await page.waitForTimeout(5000);

  console.log("[hn] 投稿完了:", page.url());
} catch (e) {
  console.error("[hn] エラー:", e.message);
  process.exit(1);
} finally {
  await browser.close();
}
