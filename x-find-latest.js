import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addCookies([
  { name: "auth_token", value: "4dbf925d2e213d8acfe3d5499223e7ac134268ff", domain: ".x.com", path: "/", httpOnly: true, secure: true },
  { name: "ct0",        value: "9507a7683e2852fe6692c43ea8500fbb01e045c73c9ea3423c761f9ccba68ce86c5f800aa745c81d622baa68134e7558a2f1f63573f5f1c1f614569cd3ff193d53244f815815cf9dabb433f52fbd4e59", domain: ".x.com", path: "/", secure: true },
]);
const page = await ctx.newPage();
await page.goto("https://x.com/oznosekai42");
await page.waitForTimeout(4000);
const links = await page.$$eval('a[href*="/oznosekai42/status/"]', a => a.slice(0, 5).map(x => x.href));
console.log(JSON.stringify([...new Set(links)], null, 2));
await browser.close();
