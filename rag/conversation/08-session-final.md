# セッション最終状態 (2026-04-14〜16)

## 確定したビジョン

**OZC = 世界一公平なデータ置き場**

- 全ての情報が、誰でも見える基準で、公平にジャッジされる場所を作る
- 透明性が本質。分散は手段。お金を取ることは問題ではなく、見えないところで序列が操作されることが問題
- 情報が無料だから独裁になった。値段をつければ資本主義に戻る。OZCはそのための値札

## 最終アーキテクチャ

### 本番（Base Mainnet）
- OZCToken: 0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144
- OzMarket: 0xc1f93ecc3a40f28bb9cf001a85ca7477fe41a3d6（全OZC建て bonding curve）
- OzIndexFinal: 0x7e846cfe52c2c5118a1d7f132c3212a21500889f（分散index + back/unback）

### ローカルdevnet（Codespace）
- Chain ID: 420420, Gas: 0
- OZCToken: 0x5FbDB2315678afecb367f032d93F642f64180aa3
- OzMarket: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
- 起動成功、save テスト完了

## 進化の記録（V1→最終形）
1. DataRegistry（claim市場）→ 2. V2（5%還元）→ 3. URLValuation（ETH bonding）→ 4. OzIndex（分散index）→ 5. OzIndexFinal（back/unback、配当なし）→ 6. OzMarket（全OZC建て、bonding curve、save/sell）→ 7. OZC Chain devnet（ETH不要）

## 学んだ最適化のミス（I1-I7）
- I1: edge定義は独立actionに1:1対応
- I2: Bayes更新は観測edgeのみ
- I3: 親prune前に子enumerate必須
- I4: 各サイクルでaction space検査
- I5: 機能追加は「大問い→仮説→実装」経路のみ
- I6: OZCは仮説実装、結論主張禁止
- I7: 新規リソース取得前に既存リソース列挙（Codespaces発見の教訓）

## Credentials
- X cookies: auth_token=4dbf925d..., ct0=9507a768...
- npm: @joejoejoejoe/ozc, token=npm_aYTsjMLA...
- dev.to API: VtCQrsDn8dUvKMu9HvtHNCeY
- Neynar: 4DE05834-D6DE-4048-80A1-C49F869B2FC6 (read only)
- Deployer key: 0x9a78d428...
- User wallet: 0xB8E5dDB2... key: 0xcdb2cc43...

## 外部投稿
- awesome-mcp PR #4829, awesome-ai-agents PR #782, awesome-ethereum PR #65
- MCP spec Discussion #2579, AutoGen Discussion #7585
- dev.to記事公開済, X投稿+influencerリプ
- GitHub issue リプ5件

## 次セッションでやること
- ユーザーが好きなURLを50件save（本物の人間の趣味嗜好をindexに）
- ブックマークレット作成（1クリックsave）
- 公開web検索ページ（CLI不要で検索）
- npm republish（最新CLI）
- L3チェーンの外部公開（Codespaces or VPS）
- README に「世界一公平なデータ置き場」を反映
