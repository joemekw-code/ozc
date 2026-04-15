#!/usr/bin/env node
// X (Twitter) 投稿スクリプト
//
// X API v2 は現在 paid tier でのみ write 可能。
// 代替として auth_token cookie によるブラウザ自動化を実装。
//
// 必要な環境変数（どちらか）:
//
// A. API経由（有料 API tier必要）:
//   X_BEARER      - Bearer token
//   X_API_KEY     - OAuth1.0a consumer key
//   X_API_SECRET  - OAuth1.0a consumer secret
//   X_TOKEN       - OAuth1.0a access token
//   X_TOKEN_SECRET - OAuth1.0a access token secret
//
// B. ブラウザ自動化（無料、cookieから）:
//   X_COOKIE_AUTH_TOKEN - x.comにログインした状態のauth_token cookie
//   X_COOKIE_CT0        - ct0 cookie
//
// オプション:
//   X_TEXT       - 投稿本文（デフォルトは下記）
//   X_MEDIA_PATH - 添付画像/GIFのローカルパス（デフォルト: launch/demo.gif）
//
// 実行:
//   X_COOKIE_AUTH_TOKEN=... X_COOKIE_CT0=... node launch/auto/x.js

import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";

const TEXT = process.env.X_TEXT || `あらゆる文明で、情報の信頼は権威から切り離せなかった。
神官、新聞、プラットフォーム、ファクトチェッカー。名前が変わるだけで構造は同じ。

OZCはそれを切り離す実験。個人がsignalを張り、集まった分布が真偽を決める。

https://github.com/joemekw-code/ozc`;

const MEDIA = process.env.X_MEDIA_PATH || "launch/demo.gif";

if (!process.env.X_COOKIE_AUTH_TOKEN || !process.env.X_COOKIE_CT0) {
  console.error(`環境変数不足。
  ブラウザでx.comにログイン → DevTools → Application → Cookies → x.com から
    auth_token と ct0 の2つをコピーして以下を設定:
      X_COOKIE_AUTH_TOKEN=<auth_token>
      X_COOKIE_CT0=<ct0>`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: process.env.X_COOKIE_AUTH_TOKEN, domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: process.env.X_COOKIE_CT0,        domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();

try {
  await page.goto("https://x.com/compose/post");
  await page.waitForTimeout(3000);

  const editor = await page.locator('[role="textbox"][data-testid="tweetTextarea_0"]').first();
  await editor.click();
  await editor.fill(TEXT);

  if (existsSync(MEDIA)) {
    const [ch] = await Promise.all([
      page.waitForEvent("filechooser"),
      page.locator('[data-testid="fileInput"]').first().click({ force: true }).catch(() => {}),
    ]).catch(() => [null]);
    if (ch) {
      await ch.setFiles(MEDIA);
      console.log(`[x] media attached: ${MEDIA}`);
      await page.waitForTimeout(4000);
    }
  }

  console.log("[x] 15秒後に送信。間違いがあれば Ctrl+C で中断してください。");
  await page.waitForTimeout(15000);
  await page.locator('[data-testid="tweetButton"]').first().click();
  await page.waitForTimeout(5000);

  console.log("[x] 投稿完了:", page.url());
} catch (e) {
  console.error("[x] エラー:", e.message);
  process.exit(1);
} finally {
  await browser.close();
}
