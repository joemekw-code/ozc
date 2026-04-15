#!/usr/bin/env node
// Indie Hackers 自動投稿スクリプト（Playwright）
//
// Indie Hackers は公式な投稿用 public API を提供していません
// （内部 GraphQL endpoint はあるが認証が Cookie/CSRF ベースで公開仕様なし）。
// したがってブラウザ自動化（Playwright）で対応します。
//
// 投稿先: "Starting Up" グループの post 作成フォーム
//   https://www.indiehackers.com/group/starting-up/new-post
// （ログイン必須）
//
// 必要な環境変数:
//   IH_EMAIL  - ログイン email
//   IH_PASS   - パスワード
//
// オプション:
//   IH_MARKDOWN - 本文 markdown のパス。デフォルト: launch/posts/indiehackers.md
//   IH_TITLE    - タイトル（未指定なら markdown の最初の # 行）
//   IH_GROUP    - グループ slug。デフォルト: "starting-up"
//                  候補: starting-up / ideas-and-validation / building-in-public /
//                        tech / ai / growth
//   IH_DRY_RUN  - "true" なら送信直前で止めて手動確認できる（推奨: 初回）
//
// 実行:
//   IH_EMAIL=xxx IH_PASS=yyy IH_DRY_RUN=true node launch/auto/indiehackers.js
//
// NOTE: Indie Hackers は Stripe Labs 傘下で DOM 構造がたまに変わる。
//       失敗時は headless:false で目視デバッグしてください。

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const EMAIL = process.env.IH_EMAIL;
const PASS  = process.env.IH_PASS;

if (!EMAIL || !PASS) {
  console.error("IH_EMAIL / IH_PASS が未設定です。");
  process.exit(1);
}

const GROUP  = process.env.IH_GROUP || "starting-up";
const DRY    = process.env.IH_DRY_RUN === "true";
const MD_PATH = process.env.IH_MARKDOWN ||
  path.resolve(process.cwd(), "launch/posts/indiehackers.md");

if (!fs.existsSync(MD_PATH)) {
  console.error(`Markdown が見つかりません: ${MD_PATH}`);
  process.exit(1);
}

const raw = fs.readFileSync(MD_PATH, "utf8");
const titleMatch = raw.match(/^#\s+(.+)$/m);
const TITLE = process.env.IH_TITLE || (titleMatch ? titleMatch[1].trim() : "OZC");
const BODY  = titleMatch ? raw.replace(titleMatch[0], "").trimStart() : raw;

const browser = await chromium.launch({ headless: false });
const ctx     = await browser.newContext();
const page    = await ctx.newPage();

try {
  // --- login ---
  await page.goto("https://www.indiehackers.com/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  // ログイン成功判定（dashboard or home にリダイレクト）
  await page.waitForTimeout(3000);
  if (page.url().includes("/login")) {
    throw new Error("ログイン失敗 — credentials を確認してください");
  }
  console.log("[ih] ログイン成功:", page.url());

  // --- 新規投稿フォーム ---
  const postUrl = `https://www.indiehackers.com/group/${GROUP}/new-post`;
  await page.goto(postUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  // タイトル入力（ラベル or placeholder が "Title" のもの）
  const titleSel = 'input[placeholder*="Title" i], input[name="title"]';
  await page.waitForSelector(titleSel, { timeout: 15000 });
  await page.fill(titleSel, TITLE);

  // 本文: IH エディタは contenteditable もしくは textarea
  //   最近の UI では markdown タブがあるのでそこに貼る
  const bodySel = 'textarea[placeholder*="body" i], textarea[name="body"], textarea';
  await page.waitForSelector(bodySel, { timeout: 15000 });
  await page.fill(bodySel, BODY);

  console.log(`[ih] 入力完了  title="${TITLE}"  body=${BODY.length} chars`);

  if (DRY) {
    console.log("[ih] DRY_RUN: 送信せず 60秒待機。ブラウザで目視確認してください。");
    await page.waitForTimeout(60000);
  } else {
    console.log("[ih] 30秒後に送信。Ctrl+C で中断可。");
    await page.waitForTimeout(30000);
    // 送信ボタン（"Post" / "Submit" / "Publish"）
    const submit = await page.$('button:has-text("Post"), button:has-text("Publish"), button:has-text("Submit")');
    if (!submit) throw new Error("送信ボタンが見つかりません（UI 変更の可能性）");
    await submit.click();
    await page.waitForTimeout(6000);
    console.log("[ih] 投稿完了:", page.url());
  }
} catch (e) {
  console.error("[ih] エラー:", e.message);
  process.exit(1);
} finally {
  await browser.close();
}
