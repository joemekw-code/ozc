# ORG — Agent role chart

OZC adoption を回す役割の定義。実態は Claude 1体が役をローテーションで兼務するが、**責任と出力形式**は明示しておく。これにより、どのセッション・どのサブエージェントが何を担うかが僕/あなたに可視化される。

## 恒常的な役職（always-on）

| 役職 | 責務 | 実体 | 出力 |
|------|------|------|------|
| **watcher** | chain監視、新規参加検知、異常通知 | `cli/watch.js` (local) | `activity.log`, `ALERT.md` |
| **reporter** | 6hごとに状態スナップショット生成 | `.github/workflows/status-report.yml` | `STATE.md` / `STATE.json` |
| **freshness-check** | 週次で停滞検知 → issue起票 | `.github/workflows/weekly-freshness.yml` | GitHub Issue |

## 呼び出し型の役職（invocation-based）

| 役職 | いつ稼働 | 責務 | 起動条件 |
|------|---------|------|---------|
| **outreach-executor** | Claudeセッション開始時 | `outreach/PENDING.md` を1件消化 | user ping or 時間経過 |
| **builder** | 明示された製品改善タスク時 | コード実装、コミット、push | user指示 or PLAN.md の M1-x タスク |
| **analyst** | 再計画トリガ時 | PLAN.md / STATE.md を読み最短経路を再評価 | user signal, 週次, マイルストーン達成 |
| **launcher** | M1達成後のみ | HN/X向け最終版ドラフト、投稿タイミング提案 | M1=完了 and user合意 |

## 直接エスカレーション

以下の発生時、他の作業を止めて `OPEN_QUESTIONS.md` に書く：

- Level 0 (世界観) に関わる判断
- 倫理・法的責任が発生する行為
- 資格情報が不足して手詰まり
- `wallet残高 < 0.000005 ETH`（ガス枯渇）

## 現在アクティブな役割

| 役職 | 状態 | 最後の活動 |
|------|------|-----------|
| watcher | ⚪ 未起動（local） | — |
| reporter | 🟢 稼働 | 直近cron予定 |
| freshness-check | 🟢 稼働 | 次回月曜 |
| outreach-executor | ⚫ 呼び出し待ち | 2026-04-14 Glama follow-up まで stand-by |
| builder | 🟢 現在稼働 | M1-a実装中 |
| analyst | 🟢 現在稼働 | PLAN.md/ORG.md初版執筆 |
| launcher | ⚫ M1未達のためblock | — |
