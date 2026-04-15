#!/usr/bin/env node
// X engagement watch loop: 30分ごとに cli/x-metrics.js を実行する。
//
// 実行:
//   X_COOKIE_AUTH_TOKEN=... X_COOKIE_CT0=... node cli/x-watch.js
//
// オプション:
//   X_WATCH_INTERVAL_MS - 間隔 (default: 1800000 = 30分)

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, "x-metrics.js");
const INTERVAL = Number(process.env.X_WATCH_INTERVAL_MS || 30 * 60 * 1000);

function runOnce() {
  const t = new Date().toISOString();
  console.log(`[x-watch] ${t} tick — running x-metrics`);
  const child = spawn(process.execPath, [SCRIPT], { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    console.log(`[x-watch] exit code=${code}. next run in ${INTERVAL / 1000}s`);
  });
}

console.log(`[x-watch] starting. interval=${INTERVAL}ms (${INTERVAL / 60000}min)`);
runOnce();
setInterval(runOnce, INTERVAL);
