import { chromium } from "playwright";

// AI agent/MCP系の実力者を手動選別（follower数多めの既知アカウント）
const TARGETS = [
  "swyx",                // 400k, AI engineer
  "simonw",              // 30k, deep tech
  "karpathy",            // 1M+, AI legend
  "dan_abramov",         // 400k, but shifted focus
  "nader",               // Nader Dabit, web3/AI
  "hwchase17",           // LangChain creator
  "ilblackdragon",       // NEAR
];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: "4dbf925d2e213d8acfe3d5499223e7ac134268ff", domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: "9507a7683e2852fe6692c43ea8500fbb01e045c73c9ea3423c761f9ccba68ce86c5f800aa745c81d622baa68134e7558a2f1f63573f5f1c1f614569cd3ff193d53244f815815cf9dabb433f52fbd4e59", domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();

const candidates = [];

for (const handle of TARGETS) {
  try {
    await page.goto(`https://x.com/${handle}`);
    await page.waitForTimeout(3000);
    const posts = await page.$$eval('article[data-testid="tweet"]', els =>
      els.slice(0, 3).map(el => {
        const a = el.querySelector('a[href*="/status/"]');
        const text = el.querySelector('[data-testid="tweetText"]')?.innerText || "";
        return { href: a?.href || "", text: text.slice(0, 280) };
      })
    );
    for (const p of posts) {
      // OZC関連キーワード
      const relevant = /llm|agent|reason|trust|hallucinat|truth|verify|knowledge|multi.agent|attestation|reputation|evaluat/i.test(p.text);
      if (relevant && p.href) candidates.push({ handle, ...p });
    }
  } catch (e) {}
}

console.log(JSON.stringify(candidates.slice(0, 10), null, 2));
await browser.close();
