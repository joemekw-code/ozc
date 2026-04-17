// OZC Chrome Extension — injects OZC backing info into YouTube and X
// Reads directly from Base mainnet (no server needed)

const RPC = "https://base-rpc.publicnode.com";
const OZ_MARKET = "0xc1f93ecc3a40f28bb9cf001a85ca7477fe41a3d6";

// keccak256 from keccak256.js (loaded before this script)
async function keccak256(text) {
  return window.ozcKeccak256(text);
}

// RPC call to Base mainnet
async function rpcCall(to, data) {
  try {
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to, data }, "latest"] })
    });
    const j = await r.json();
    return j.result || "0x0";
  } catch { return "0x0"; }
}

function pad(hex, width = 64) {
  return hex.replace("0x", "").padStart(width, "0");
}

// Get total shares + reserve for a URL hash
async function getOZCData(url) {
  const hash = await keccak256(url);
  const hashPadded = pad(hash);

  // shareSupply(bytes32) selector = first 4 bytes of keccak("shareSupply(bytes32)")
  // We use known selectors from OzMarket
  const supplyData = "0x" + "a58e24ca" + hashPadded; // placeholder selector
  const reserveData = "0x" + "0fac8dda" + hashPadded; // placeholder

  // Actually, OzMarket uses entries(bytes32) which returns a struct
  // entries selector = 0xb30906d4
  const entryData = "0xb30906d4" + hashPadded;
  const result = await rpcCall(OZ_MARKET, entryData);

  if (result === "0x0" || result.length < 130) {
    return { exists: false, shares: 0, reserve: 0, url, hash };
  }

  const hex = result.slice(2);
  // Entry struct: location(string), aiMemo(string), firstSaver(address), shareSupply(uint256), ozcReserve(uint256), exists(bool)
  // The struct offsets are dynamic for strings, but shareSupply and ozcReserve are at fixed positions after the dynamic offsets
  // Positions: [0-64] location offset, [64-128] aiMemo offset, [128-192] firstSaver, [192-256] shareSupply, [256-320] ozcReserve, [320-384] exists
  try {
    const shares = parseInt(hex.slice(192, 256), 16);
    const reserve = parseInt(hex.slice(256, 320), 16);
    const exists = parseInt(hex.slice(320, 384), 16);
    return { exists: !!exists, shares, reserve, reserveOZC: reserve / 1e18, url, hash };
  } catch {
    return { exists: false, shares: 0, reserve: 0, url, hash };
  }
}

// Create OZC badge element
function createBadge(data) {
  const badge = document.createElement("span");
  badge.className = "ozc-badge" + (data.shares === 0 ? " ozc-zero" : data.shares > 10 ? " ozc-hot" : "");
  badge.innerHTML = `<span class="ozc-icon">◆</span>${data.shares > 0 ? data.shares + " OZC" : "—"}`;
  badge.title = data.exists
    ? `${data.shares} shares backed | ${data.reserveOZC.toFixed(4)} OZC locked\nClick to view on OZC`
    : `Not yet on OZC\nClick to list this URL`;
  badge.addEventListener("click", () => {
    window.open(`https://joemekw-code.github.io/ozc/leaderboard.html`, "_blank");
  });
  return badge;
}

// ── YouTube ──
async function processYouTube() {
  // Video page
  const videoLinks = document.querySelectorAll("a#video-title-link, a#video-title, ytd-rich-grid-media a#thumbnail");
  const processed = new Set();

  for (const link of videoLinks) {
    if (processed.has(link.href) || link.querySelector(".ozc-badge")) continue;
    processed.add(link.href);

    const url = link.href.split("&")[0]; // clean URL
    const data = await getOZCData(url);

    const titleEl = link.closest("ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer");
    const insertPoint = titleEl?.querySelector("#meta, #metadata, .metadata") || link.parentElement;
    if (insertPoint && !insertPoint.querySelector(".ozc-badge")) {
      insertPoint.appendChild(createBadge(data));
    }
  }

  // Current video page
  if (location.pathname === "/watch") {
    const url = location.href.split("&")[0];
    const existing = document.querySelector("#above-the-fold .ozc-badge, #title .ozc-badge");
    if (!existing) {
      const data = await getOZCData(url);
      const titleContainer = document.querySelector("#above-the-fold #title, h1.ytd-watch-metadata");
      if (titleContainer) {
        titleContainer.appendChild(createBadge(data));
      }
    }
  }
}

// ── X / Twitter ──
async function processX() {
  const tweets = document.querySelectorAll("article[data-testid='tweet']");

  for (const tweet of tweets) {
    if (tweet.querySelector(".ozc-badge")) continue;

    // Find tweet URL
    const timeLink = tweet.querySelector("a time")?.closest("a") || tweet.querySelector("a[href*='/status/']");
    if (!timeLink) continue;

    const url = "https://x.com" + new URL(timeLink.href).pathname;
    const data = await getOZCData(url);

    const actionBar = tweet.querySelector("[role='group']");
    if (actionBar && !actionBar.querySelector(".ozc-badge")) {
      actionBar.appendChild(createBadge(data));
    }
  }
}

// ── Main loop ──
async function run() {
  const host = location.hostname;
  if (host.includes("youtube.com")) {
    await processYouTube();
  } else if (host.includes("x.com") || host.includes("twitter.com")) {
    await processX();
  }
}

// Run on load and on DOM changes (SPA navigation)
run();
const observer = new MutationObserver(() => { run(); });
observer.observe(document.body, { childList: true, subtree: true });
