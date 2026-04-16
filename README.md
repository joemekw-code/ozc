# OZC

**Your AI's information filter — owned by you, not by Google or OpenAI.**

Add one file to your project. Your AI gets a trust layer that you control.

```python
from ozc_filter import OZCFilter
f = OZCFilter()

# Which of these sources should my AI trust?
f.filter_urls(["https://bitcoin.org/bitcoin.pdf", "https://scam.example.com"])
# → bitcoin.pdf: 55 OZC staked (trusted), scam.example.com: 0 (unknown)

# Rerank RAG results by trust score
reranked = f.rerank(my_retrieved_docs, key=lambda d: d["url"])

# Add to any LLM as a system prompt
prompt = f.system_prompt()  # → "Prefer sources with higher trust scores..."
```

**Why?** Every AI company decides what your AI can see. OZC lets *you* decide. The shared ledger shows what others trust (OZC staked), but you choose your own filter rules.

![OZC demo](./launch/demo.gif)

---

## 問い

AIエージェントが人間の日常判断の相当部分を代替する時代に入った。  
その時、AI が扱う情報を**誰が精査するのか**。

従来の答えは、AI企業 / プラットフォーム / ファクトチェッカーといった中央集権の機関。  
しかしそれは、情報を精査する権限をまた別の権威に預けることでしかない。

真の問いは： **個人が、自分の精査基準を持てるか**。

## 仮説

個人の判断を集合として可視化する仕組みがあれば、  
個人は自分の基準を表明でき、他の個人の基準の分布を見て参考にできる。  
「みんなの答え」ではなく、「誰が何を信じているかの分布」を可視化する。

その仕組みとして、OZC は **市場性（個人が有限のリソースを主張に配分する）** を採用した。

## OZC が試すこと

- 誰でも主張を公開できる（hash + 概要で台帳に刻む）
- 各個人は有限の signal を持ち、信じる主張に配分する
- 支持の分布が時間とともに可視化される
- 公開者には後続支持の 5% が attribution として還元される
- 貨幣との交換路はない（signal は購入できない）
- さらに、**AI が読む客観尺度** として、claim ごとに commit された ETH 累積額を on-chain に露出

OZC 自体は結論ではない。  
「個人が情報精査基準を持てるか」という問いに、市場性という1つの仮説で答えた道具です。

---

## 試す（3つの経路）

### A. npx 1行（clone不要）

```bash
npx -y @joejoejoejoe/ozc list
npx -y @joejoejoejoe/ozc verify "<任意の主張>"
```

### B. REST gateway（ChatGPT Actions / n8n / 等）

```bash
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc ozc-gateway
# → http://localhost:8787  OpenAPIは /openapi.json
```

### C. MCP サーバ（Claude Desktop / Cursor / Cline）

```json
{ "mcpServers": { "ozc": {
  "command": "npx",
  "args": ["-y","@joejoejoejoe/ozc","ozc-mcp"],
  "env": { "OZC_PRIVATE_KEY": "0x..." }
}}}
```

---

## 技術仕様

| コンポーネント | アドレス |
|--------------|--------|
| 主張レジストリ   | [`0x3ca993e7183824e11b2a65cf183b4c3521bf4754`](https://basescan.org/address/0x3ca993e7183824e11b2a65cf183b4c3521bf4754) |
| signal 台帳       | [`0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144`](https://basescan.org/address/0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144) |
| 初回配布          | [`0xea827C90a2ed12afcebBFaF5CBd577c10905222d`](https://basescan.org/address/0xea827C90a2ed12afcebBFaF5CBd577c10905222d) |
| ETH commitment 層 | [`0x675d23f2e14ee862846e375ba385eae567d5d985`](https://basescan.org/address/0x675d23f2e14ee862846e375ba385eae567d5d985) |

Chain: Base mainnet (8453)

---

## ドキュメント

- [INTEGRATE.md](./INTEGRATE.md) — 既存エージェントへの統合（Python/JS/MCP/curl）
- [AGENT.md](./AGENT.md) — エージェント運用者向け
- [OPERATIONS.md](./OPERATIONS.md) — 自律運用の内部構造
- [PATH.md](./PATH.md) — 最短経路の planning graph
- [STATE.md](./STATE.md) — 現在のオンチェーン状態

---

## Claude Code / MCP Install

```bash
claude mcp add ozc -- node /path/to/ozc/cli/mcp-server.js
```

Read-only は `OZC_PRIVATE_KEY` なしで動く。  
書き込み（back / publish）は wallet と少額の Base ETH が必要。

---

**OZCは答えではない。問いへの1つの仮説の実装。**  
結果は市場の分布として見える。同意できない時は、自分で別の仮説を実装してください。
