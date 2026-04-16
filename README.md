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

**Why?** Every AI company decides what your AI can see. OZC lets *you* decide. The shared ledger shows what others value (OZC committed), but you choose your own filter rules.

![OZC demo](./launch/demo.gif)

---

## The Question

We've entered an era where AI agents handle a significant portion of human daily decisions. So — **who decides what information is trustworthy?**

The conventional answer: AI companies, platforms, fact-checkers — centralized authorities. But that just hands the power of information scrutiny to yet another authority.

The real question: **Can individuals hold their own criteria for evaluating information?**

## Hypothesis

If individual judgments can be collectively visualized, each person can express their criteria and reference the distribution of others' criteria. Not "the crowd's answer" but "the distribution of who believes what."

OZC adopts **market dynamics** as the mechanism — individuals allocate finite resources to claims they believe in.

## What OZC Tests

- Anyone can save a URL or claim to a shared on-chain index
- Each person commits OZC (a non-purchasable allocation) to information they value
- The distribution of commitments becomes visible over time
- A bonding curve rewards early discoverers — later backers pay more
- No external exchange path — OZC cannot be bought with other currencies
- AI reads one number per entry: `totalBacked` — the collective conviction

OZC is not the answer. It's one tool testing one hypothesis: can market dynamics make individual information criteria visible?

---

## Try It (3 paths)

### A. One-liner (no clone needed)

```bash
npx -y @joejoejoejoe/ozc list
npx -y @joejoejoejoe/ozc verify "<any claim>"
npx -y @joejoejoejoe/ozc search "AI trust" --local ~/Documents
```

### B. REST Gateway (ChatGPT Actions / n8n / etc.)

```bash
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc ozc-gateway
# → http://localhost:8787  OpenAPI at /openapi.json
```

### C. MCP Server (Claude Desktop / Cursor / Cline)

```json
{ "mcpServers": { "ozc": {
  "command": "npx",
  "args": ["-y","@joejoejoejoe/ozc","ozc-mcp"],
  "env": { "OZC_PRIVATE_KEY": "0x..." }
}}}
```

---

## Contracts

### OZC Chain (local devnet)
- Chain ID: `420420`
- Gas: effectively zero (OZC only, no ETH needed)
- OzMarket: handles save/sell with per-entry bonding curve

### Base Mainnet (production)

| Component | Address |
|-----------|---------|
| OZC Token | [`0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144`](https://basescan.org/address/0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144) |
| OzMarket | [`0xc1f93ecc3a40f28bb9cf001a85ca7477fe41a3d6`](https://basescan.org/address/0xc1f93ecc3a40f28bb9cf001a85ca7477fe41a3d6) |
| OzIndexFinal | [`0x7e846cfe52c2c5118a1d7f132c3212a21500889f`](https://basescan.org/address/0x7e846cfe52c2c5118a1d7f132c3212a21500889f) |

---

## Documentation

- [INTEGRATE.md](./INTEGRATE.md) — Integration guide (Python / JS / MCP / curl)
- [AGENT.md](./AGENT.md) — Operator manual for autonomous agents
- [USECASES.md](./USECASES.md) — Concrete use cases
- [PATH.md](./PATH.md) — Hierarchical planning graph (Dijkstra-based optimization)

---

## Run Your Own OZC Chain

```bash
# Start local chain (GitHub Codespaces or any machine with Docker)
anvil --chain-id 420420 --block-time 2 --gas-price 0 --base-fee 0 &

# Deploy OZC Token + OzMarket
bash scripts/deploy-local.sh

# Save any URL
cast send <MARKET_ADDR> "save(string,string,uint256)" "https://example.com" "description" 1 --from <ADDR> --unlocked
```

---

## Claude Code / MCP Install

```bash
claude mcp add ozc -- node /path/to/ozc/cli/mcp-server.js
```

Read-only works without `OZC_PRIVATE_KEY`. Write operations (save / sell) require a wallet.

---

**OZC is not the answer. It's one hypothesis, implemented. The market's distribution shows the result. If you disagree, build your own.**
