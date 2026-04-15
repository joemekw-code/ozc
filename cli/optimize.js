#!/usr/bin/env node
// 最適化関数の定量化。
// `metrics/decisions.jsonl` を読んで、edge別に prior vs observed の履歴を集計。
// 未来の意思決定で Bayes 更新に使う posterior を返す。

import { readFileSync, existsSync } from "fs";

const LOG = "metrics/decisions.jsonl";
if (!existsSync(LOG)) { console.error("no decisions log"); process.exit(1); }

const rows = readFileSync(LOG, "utf8")
  .split("\n").filter(Boolean).map(l => JSON.parse(l));

const edges = {};
for (const r of rows) {
  if (!edges[r.edge]) edges[r.edge] = { count: 0, cost_h: 0, prior_sum: 0, observed_sum: 0, observed_n: 0, pending: 0 };
  const e = edges[r.edge];
  e.count += 1;
  e.cost_h += r.cost_h;
  e.prior_sum += r.prior_prob ?? 0;
  if (r.observed_prob !== null && r.observed_prob !== undefined) {
    e.observed_sum += r.observed_prob;
    e.observed_n   += 1;
  } else {
    e.pending += 1;
  }
}

console.log("\n=== OZC optimization function — posterior estimates ===\n");
console.log("edge | n | total_cost_h | prior | observed (n) | posterior | ev/hour");
console.log("---|---|---|---|---|---|---");

for (const [name, e] of Object.entries(edges)) {
  const prior_mean = (e.prior_sum / e.count);
  const observed_mean = e.observed_n > 0 ? (e.observed_sum / e.observed_n) : null;
  // Bayes更新（観測があれば観測寄り、無ければpriorそのまま）
  const posterior = observed_mean !== null
    ? (0.3 * prior_mean + 0.7 * observed_mean)
    : prior_mean;
  const ev_per_hour = posterior / (e.cost_h / e.count);  // expected success per hour invested
  console.log([
    name,
    e.count,
    e.cost_h.toFixed(2),
    prior_mean.toFixed(2),
    observed_mean !== null ? `${observed_mean.toFixed(2)} (${e.observed_n})` : `— (pending ${e.pending})`,
    posterior.toFixed(2),
    isFinite(ev_per_hour) ? ev_per_hour.toFixed(2) : "—",
  ].join(" | "));
}

console.log("\n--- 次アクション候補ランキング（posterior × 未来の類似アクション期待回数）---\n");

const byEV = Object.entries(edges)
  .map(([name, e]) => {
    const prior_mean = e.prior_sum / e.count;
    const observed_mean = e.observed_n > 0 ? e.observed_sum / e.observed_n : null;
    const posterior = observed_mean !== null ? (0.3 * prior_mean + 0.7 * observed_mean) : prior_mean;
    return { name, posterior, cost_per_action: e.cost_h / e.count, ev_per_hour: posterior / (e.cost_h / e.count) };
  })
  .filter(r => isFinite(r.ev_per_hour))
  .sort((a, b) => b.ev_per_hour - a.ev_per_hour);

for (const r of byEV) {
  console.log(`  ${r.name}: ev/h=${r.ev_per_hour.toFixed(2)}  posterior=${r.posterior.toFixed(2)}  cost=${r.cost_per_action.toFixed(2)}h`);
}

console.log(`\n記録件数: ${rows.length}  edge種: ${Object.keys(edges).length}\n`);
