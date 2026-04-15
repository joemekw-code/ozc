import { chromium } from "playwright";

// 16時間前のChatGPT判断基準の投稿にリプライ
const TARGET_PROFILE = "https://x.com/oznosekai42";
const REPLY_TEXT = `これに答えたくて作った：OZC

個人がsignalを張り、集まった分布が「信じていい」の判断基準を担う。
権威でも投票でもない。

https://github.com/joemekw-code/ozc`;

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: "4dbf925d2e213d8acfe3d5499223e7ac134268ff", domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: "9507a7683e2852fe6692c43ea8500fbb01e045c73c9ea3423c761f9ccba68ce86c5f800aa745c81d622baa68134e7558a2f1f63573f5f1c1f614569cd3ff193d53244f815815cf9dabb433f52fbd4e59", domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();

await page.goto(TARGET_PROFILE);
await page.waitForTimeout(4000);

// Find the ChatGPT post (16h前) — find article containing "ChatGPT"
const target = await page.locator('article[data-testid="tweet"]:has-text("ChatGPT")').first();
if (!(await target.count())) {
  console.error("ChatGPT post not found");
  await browser.close();
  process.exit(1);
}

await target.scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
await target.locator('[data-testid="reply"]').first().click();
await page.waitForTimeout(3000);

const editor = page.locator('[role="textbox"][data-testid="tweetTextarea_0"]').first();
await editor.click();
await editor.fill(REPLY_TEXT);
await page.waitForTimeout(2000);

console.log("[reply] 10秒後送信");
await page.waitForTimeout(10000);
await page.locator('[data-testid="tweetButton"]').first().click();
await page.waitForTimeout(5000);

console.log("[reply] 完了:", page.url());
await browser.close();
