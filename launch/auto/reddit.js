#!/usr/bin/env node
// Reddit 投稿スクリプト（Reddit公式API使用）
//
// 必要な環境変数:
//   RD_CLIENT_ID     - reddit.com/prefs/apps で作成した script-type app の client id
//   RD_CLIENT_SECRET - 同 secret
//   RD_USER          - Redditユーザー名
//   RD_PASS          - パスワード
// オプション:
//   RD_SUB       - サブレディット（デフォルト: test — 最初はtestでdry-run推奨）
//   RD_TITLE     - タイトル
//   RD_URL       - URL（textとは排他）
//   RD_TEXT      - self-text本文
//
// 実行:
//   RD_CLIENT_ID=... RD_CLIENT_SECRET=... RD_USER=... RD_PASS=... \
//   RD_SUB=LocalLLaMA node launch/auto/reddit.js

const { RD_CLIENT_ID, RD_CLIENT_SECRET, RD_USER, RD_PASS } = process.env;
const SUB   = process.env.RD_SUB   || "test";
const TITLE = process.env.RD_TITLE || "OZC — detaching information trust from authority";
const URL   = process.env.RD_URL   || "https://github.com/joemekw-code/ozc";
const TEXT  = process.env.RD_TEXT  || "";

if (!RD_CLIENT_ID || !RD_CLIENT_SECRET || !RD_USER || !RD_PASS) {
  console.error("RD_CLIENT_ID / RD_CLIENT_SECRET / RD_USER / RD_PASS が必要です。");
  process.exit(1);
}

const ua   = "ozc-launcher/0.1 by " + RD_USER;
const auth = Buffer.from(`${RD_CLIENT_ID}:${RD_CLIENT_SECRET}`).toString("base64");

const tokenR = await fetch("https://www.reddit.com/api/v1/access_token", {
  method: "POST",
  headers: { Authorization: `Basic ${auth}`, "User-Agent": ua, "content-type": "application/x-www-form-urlencoded" },
  body: `grant_type=password&username=${encodeURIComponent(RD_USER)}&password=${encodeURIComponent(RD_PASS)}`,
});
const tokenJ = await tokenR.json();
if (!tokenJ.access_token) { console.error("token取得失敗:", tokenJ); process.exit(1); }

const form = new URLSearchParams({ sr: SUB, title: TITLE, kind: URL ? "link" : "self", api_type: "json" });
if (URL)  form.set("url", URL);
if (TEXT) form.set("text", TEXT);

const postR = await fetch("https://oauth.reddit.com/api/submit", {
  method: "POST",
  headers: { Authorization: `Bearer ${tokenJ.access_token}`, "User-Agent": ua, "content-type": "application/x-www-form-urlencoded" },
  body: form.toString(),
});
const postJ = await postR.json();

if (postJ?.json?.errors?.length) {
  console.error("投稿エラー:", postJ.json.errors);
  process.exit(1);
}
console.log("投稿成功:", postJ?.json?.data?.url || postJ);
