#!/usr/bin/env node
// dev.to 自動投稿スクリプト（公式 REST API）
//
// dev.to には公式 API があります。POST /api/articles でそのまま記事を publish 可能。
// docs: https://developers.forem.com/api/v1#tag/articles/operation/createArticle
//
// ============================================================
// API token 取得手順（初回のみ / ブラウザ操作）
//   1. https://dev.to にログイン
//   2. 右上アイコン → Settings → Extensions
//        もしくは直接 https://dev.to/settings/extensions
//   3. "DEV Community API Keys" セクションで
//        - Description: "ozc-launch"
//        - Generate API Key をクリック
//   4. 表示された 40文字前後の token をコピー（再表示不可）
//   5. 下記の環境変数にセット
// ============================================================
//
// 必要な環境変数:
//   DEVTO_API_KEY  - 上で取得した API key
//
// オプション:
//   DEVTO_DRAFT        - "true" ならdraftとして保存（published=false）。デフォルト: true
//   DEVTO_MARKDOWN     - 記事本文 markdown ファイルのパス。デフォルト: launch/posts/devto.md
//   DEVTO_TITLE        - タイトル（指定なければ markdown の最初の # から抽出）
//   DEVTO_TAGS         - カンマ区切り（最大4つ）。デフォルト: "ai,web3,opensource,agents"
//   DEVTO_CANONICAL    - canonical URL。デフォルト: https://github.com/joemekw-code/ozc
//   DEVTO_COVER_IMAGE  - main cover image URL
//
// 実行:
//   DEVTO_API_KEY=xxx DEVTO_DRAFT=false node launch/auto/devto.js
//
// publish 後: response.url が投稿 URL

import fs from "node:fs";
import path from "node:path";

const API_KEY = process.env.DEVTO_API_KEY;
if (!API_KEY) {
  console.error("DEVTO_API_KEY が未設定です。https://dev.to/settings/extensions で発行してください。");
  process.exit(1);
}

const DRAFT = process.env.DEVTO_DRAFT !== "false"; // 既定 draft
const MD_PATH =
  process.env.DEVTO_MARKDOWN ||
  path.resolve(process.cwd(), "launch/posts/devto.md");

if (!fs.existsSync(MD_PATH)) {
  console.error(`Markdown が見つかりません: ${MD_PATH}`);
  process.exit(1);
}

const raw = fs.readFileSync(MD_PATH, "utf8");

// 最初の # 見出しをタイトルとして抽出
const titleMatch = raw.match(/^#\s+(.+)$/m);
const TITLE = process.env.DEVTO_TITLE || (titleMatch ? titleMatch[1].trim() : "OZC");
// 本文はタイトル行を除く
const BODY = titleMatch ? raw.replace(titleMatch[0], "").trimStart() : raw;

const TAGS = (process.env.DEVTO_TAGS || "ai,web3,opensource,agents")
  .split(",").map(s => s.trim()).filter(Boolean).slice(0, 4);

const CANONICAL = process.env.DEVTO_CANONICAL || "https://github.com/joemekw-code/ozc";
const COVER     = process.env.DEVTO_COVER_IMAGE ||
  "https://raw.githubusercontent.com/joemekw-code/ozc/main/launch/demo.gif";

const payload = {
  article: {
    title: TITLE,
    body_markdown: BODY,
    published: !DRAFT,
    main_image: COVER,
    canonical_url: CANONICAL,
    tags: TAGS,
  },
};

console.log(`[devto] POST https://dev.to/api/articles  draft=${DRAFT}  tags=${TAGS.join(",")}`);

const res = await fetch("https://dev.to/api/articles", {
  method: "POST",
  headers: {
    "api-key": API_KEY,
    "content-type": "application/json",
    "accept": "application/vnd.forem.api-v1+json",
  },
  body: JSON.stringify(payload),
});

const text = await res.text();
if (!res.ok) {
  console.error(`[devto] ${res.status} ${res.statusText}`);
  console.error(text);
  process.exit(1);
}

let json;
try { json = JSON.parse(text); } catch { json = { raw: text }; }

console.log("[devto] 成功");
console.log("  id:       ", json.id);
console.log("  url:      ", json.url);
console.log("  published:", json.published);
console.log("  edit:     ", json.url ? json.url.replace(/\/[^/]+$/, "/edit") : "(n/a)");
