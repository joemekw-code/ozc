# デプロイ履歴 (2026-04-14〜15)

## Phase 1: Base Sepolia テストネット
- OZCToken, DataRegistry, BondingCurve, CapacityMarket をデプロイ
- テスト: deploy → stake → unstake → 利益確定サイクル検証成功
- Genesis Entry #0 をオンチェーンに刻印

## Phase 2: Base Mainnet
- SOL→ETH bridge ($0.78) でガス代確保
- Wallet: 0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6
- 全コントラクト Base mainnet にデプロイ
- Genesis tx: 0xbc4045399fec5e6edf3216add9e97532e5ccfa0137780eef476487a2c8f17612

## Phase 3: V2 (Creator Commission)
- DataRegistryV2: 5% 著者還元追加
- OZCFaucet: 新規アドレスに100 signal配布
- SponsoredFaucet: ガスレスonboarding

## Phase 4: ClaimValuation
- ETH commitment層: 人間がお金をかけた額 = AI-readable metric
- valuationETH(id) 関数

## Phase 5: URLValuation
- 任意のURL/情報に対して ETH で bonding curve 売買
- buyByString / sell 機能

## Phase 6: OzIndex V1-V3
- 分散インデックス: location + AI memo
- V2: OZC burn で追加（動的fee）
- V3: OZC lock（burn→lock、slot売買可能）

## Phase 7: OzIndexFinal（現行）
- lock + back/unback（配当なし、勝手に値段をつけるだけ）
- slot 売買（list/buyListing/transfer/remove）
- Contract: 0x7e846cfe52c2c5118a1d7f132c3212a21500889f
