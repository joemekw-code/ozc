# OZC Operations

OZCは人間の日常的介入なしで成長するように構成されている。
この文書は、誰(どのAI)が何をどう自律実行しているかの現在状態を示す。
変更があれば、実行者自身がこの文書を更新する義務を持つ。

## Escalation boundary

以下のみ人間の判断を必要とする。それ以外は全てAIが独断で実行する：

- ビジョン・世界観の変更
- 倫理的な枠組みの判断
- プロジェクトの存続・停止
- 法的責任を伴う外部行為

## Autonomous workers

### W1. on-chain watcher (local cron)
- 実体: `cli/watch.js`
- 周期: 5秒ループ
- 責任:
  - 新しい主張・支持・faucet claim を検知
  - `activity.log` に追記
  - 異常（ガス残高低下など）は `ALERT.md` に書き出し、次回の人間アクセス時に可視化
- 停止条件: なし（プロセスが生きている限り走る）

### W2. status-report (GitHub Actions, scheduled)
- 実体: `.github/workflows/status-report.yml`
- 周期: 6時間おき
- 責任:
  - on-chain 状態を読み、`STATE.md` を生成
  - 変化があれば main に直接コミット
  - 新規主張・新規支持者・累計集合 signal を記録
- 停止条件: 手動無効化のみ

### W3. freshness-check (GitHub Actions, weekly)
- 実体: `.github/workflows/weekly-freshness.yml`
- 周期: 毎週月曜 00:00 UTC
- 責任:
  - 過去7日の新規主張数 < 2 なら issue を開く「organic参加が停滞」
  - 過去7日の新規支持数 < 5 なら issue を開く「需要側停滞」
- 停止条件: 手動無効化のみ

### W4. outreach-backlog (manual-triggered, AI-executed)
- 実体: `outreach/PENDING.md` にリスト化された提出先
- 周期: 次回Claudeセッション開始時
- 責任:
  - `outreach/PENDING.md` から未提出の awesome-list/directory を消化
  - PR/提出が完了したら `outreach/DONE.md` に移動
- 停止条件: `PENDING.md` が空になるまで継続

### W5. vision-escalation
- 実体: このドキュメント末尾の「Open Questions」セクション
- 責任: AIが判断を迷った時、ここに書き残して次回の人間アクセスを待つ
- 人間は ここだけ見れば判断すべき全てが見える

## State files

- `STATE.md`      — 最新のon-chain状態（自動生成）
- `activity.log`  — 全イベント履歴（追記のみ）
- `ALERT.md`      — 対人間の即時通知（空であるべき）
- `outreach/PENDING.md`  — AIが未消化のtask list
- `outreach/DONE.md`     — 完了分
- `OPEN_QUESTIONS.md`    — 人間の判断待ち（空であるべき）

## Operator wallet

自律実行のため、デプロイヤーとは別の小額専用ウォレットを使う：

- 用途: 新規参加者の `claimFor` 代行、自動seed、監視txガス代
- 保管: GitHub Actions Secret `OPERATOR_KEY` / ローカル `.env` の `OPERATOR_KEY`
- 上限: 常時 0.005 ETH 以下（盗難損害の上限設定）
- リフィル: 残高 < 0.001 ETH で deployer から自動補充（手動判断不要）

## Change log

この組織体系を変更した時、実行者は必ずこのドキュメントと変更理由を同一PRで更新する。
