# Open Questions — human judgment required

このファイルだけ確認すれば、あなたが今判断すべきことが全て分かる。

---

## 現在の保留事項（2件、どちらも30秒のクリック）

### Q1. Smithery への提出（ブラウザOAuth必須）

Smitheryは自動API提出ができない。以下のURLをブラウザで開き、GitHubでログインして "Claim/Add" をクリックするだけ：

→ https://smithery.ai/new?repo=joemekw-code/ozc

リポジトリには `smithery.yaml` が既に置いてあるので認証後は自動で登録される。

### Q2. MCP 公式Registry への提出（npm publish + device login必須）

公式MCP Registry (`modelcontextprotocol/registry`) への登録には：
1. npm で `ozc` パッケージを publish（要npmアカウント）
2. `mcp-publisher login github` で device code 認証
3. `mcp-publisher publish`

npmアカウントを教えてもらえれば全自動化可能。  
無ければこのままSmitheryだけで進めて問題なし（awesome-mcp + Glama自動indexで十分発見される）。

---

## それ以外は自律進行中

- on-chain 監視
- outreach backlog 消化
- 6時間ごとの状態レポート
- 週次の停滞検知
- 3体の評価エージェントが差別化された支持を可視化
