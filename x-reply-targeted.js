import { chromium } from "playwright";

const REPLIES = [
  {
    url: "https://x.com/ilblackdragon/status/2042499535298314243",
    text: `完全同意。ただ attestation は「who ran what」までで、「その output が真実か」は別レイヤー。
後者に個人の signal commitment を on-chain に積む実験をしてる：
https://github.com/joemekw-code/ozc
(disclosure: maintainer)`
  },
  {
    url: "https://x.com/simonw/status/2042630738542203057",
    text: `面白い。LLM の self-report cutoff が信頼できないなら、factual claim の信頼性は外部に委ねるしかない。
個人が「これは真」と signal 張る集合台帳を実験中：
$ ozc verify "<claim>" → 既存市場の集合判断を返す
https://github.com/joemekw-code/ozc
(disclosure: maintainer)`
  },
];

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: "4dbf925d2e213d8acfe3d5499223e7ac134268ff", domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: "9507a7683e2852fe6692c43ea8500fbb01e045c73c9ea3423c761f9ccba68ce86c5f800aa745c81d622baa68134e7558a2f1f63573f5f1c1f614569cd3ff193d53244f815815cf9dabb433f52fbd4e59", domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();

for (const r of REPLIES) {
  console.log(`[reply] ${r.url}`);
  await page.goto(r.url);
  await page.waitForTimeout(4000);
  // find reply button of main post
  const replyBtn = page.locator('article[data-testid="tweet"]').first().locator('[data-testid="reply"]');
  await replyBtn.click();
  await page.waitForTimeout(3000);
  const ed = page.locator('[role="textbox"][data-testid="tweetTextarea_0"]').first();
  await ed.click();
  await ed.fill(r.text);
  await page.waitForTimeout(3000);
  console.log("  10秒後送信");
  await page.waitForTimeout(10000);
  await page.locator('[data-testid="tweetButton"]').first().click();
  await page.waitForTimeout(5000);
  console.log("  送信完了");
}

await browser.close();
