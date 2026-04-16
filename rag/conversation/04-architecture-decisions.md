# 技術的判断の記録

## Chain選択: Base (EVM)
- 理由: 最速ローンチ、AMM参考実装豊富、Solidity ecosystem
- SOLも検討したが「最速ローンチ」でBase確定

## Bonding Curve: Linear
- price = BASE + SLOPE * supply
- BASE = 1e15 (0.001 OZC)、SLOPE = 1e12
- シンプル、チューニング可能、後で変更可
- マーケティングでは「commitment gradient」と呼ぶ

## Token設計: OZC ERC-20
- 100M supply、deployer保持
- Faucet で新規100 OZC配布
- 外部交換路なし（購入不可）

## OzIndexFinal の経済設計
- add: OZC lock（動的 fee = 1 + 0.01 * activeCount OZC）
- back/unback: 配当なし、contract にロック、いつでも引き出し可
- totalBacked = その情報の「値段」
- slot 売買: list/buyListing/transfer
- remove: lock返却、entry削除

## 最適化問題の反省
- X投稿を「self-post」の1ノードで扱い、「reply to influencer」を見逃した
- 根本原因: edge定義の抽象粒度誤り + 集約Bayes更新
- 修正: I1-I6 の invariant を PATH.md に明記

## AI情報ソース問題の発見
- 各AI会社が search backend を契約選定
- WebSearch はAnthropic経由（フィルタ可能）
- Bash curl はローカル実行（フィルタ困難）
- OZC は on-chain なので技術的にblockしにくい
- ただし AI出力段階の post-filter は逃れられない

## RAG / 検索設計
- keyword: ozc search --local
- embedding: TF-IDF + cosine similarity (cli/embed.js)
- 3D: PCA 3次元に圧縮 → Three.js (docs/explore.html)
- インターネット全indexは非現実的。OZCは②共有台帳 + ①ローカルフィルタ
