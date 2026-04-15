import { chromium } from "playwright";
import { existsSync } from "fs";

const TEXT = `LLMの出力を信じる根拠は何か。

「権威あるモデルが言ったから」では、根本解になっていない。
個人がsignalを張り、集合判断の分布が真偽を担う。権威もvoteも要らない。

検証できる： npx -y @joejoejoejoe/ozc verify "<任意の主張>"

https://github.com/joemekw-code/ozc`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: "4dbf925d2e213d8acfe3d5499223e7ac134268ff", domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: "9507a7683e2852fe6692c43ea8500fbb01e045c73c9ea3423c761f9ccba68ce86c5f800aa745c81d622baa68134e7558a2f1f63573f5f1c1f614569cd3ff193d53244f815815cf9dabb433f52fbd4e59", domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();
await page.goto("https://x.com/compose/post");
await page.waitForTimeout(3500);
const editor = page.locator('[role="textbox"][data-testid="tweetTextarea_0"]').first();
await editor.click();
await editor.fill(TEXT);
const MEDIA = "launch/demo.gif";
if (existsSync(MEDIA)) {
  const [ch] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.locator('[data-testid="fileInput"]').first().click({ force: true }).catch(() => {}),
  ]).catch(() => [null]);
  if (ch) { await ch.setFiles(MEDIA); await page.waitForTimeout(3500); }
}
await page.waitForTimeout(8000);
await page.locator('[data-testid="tweetButton"]').first().click();
await page.waitForTimeout(4000);
console.log("posted:", page.url());
await browser.close();
