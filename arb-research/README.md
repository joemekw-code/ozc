# DEX Arbitrage Research — Base L2

Real on-chain data and analysis from arbitrage experiments on Base (Coinbase L2).

**Result: DEX-DEX arbitrage on Base mainnet WETH/USDC is currently unprofitable.**  
This repo documents *why*, with actual transaction data and price quotes as proof.

## Key Findings

### 1. Spread exists but doesn't survive roundtrip

| DEX A | DEX B | One-way Spread | Roundtrip P&L |
|---|---|---|---|
| Uniswap V3 (fee 500) | Aerodrome (volatile) | 0.33–0.37% | **-0.29% to -0.70%** |
| Uniswap V3 (fee 500) | Uniswap V3 (fee 3000) | ~0.24% | **-0.24%** |
| Uniswap V3 (fee 500) | Uniswap V3 (fee 10000) | ~1.2% | **-1.18%** |

**Why?** AMM fees are applied on both legs. A 0.33% spread minus 2× swap fees (0.05% + 0.30%) = net loss.

### 2. Testnet ≠ Mainnet

Base Sepolia showed 142% spread between V2/V3 — this is **testnet-specific noise** from low liquidity. 
We executed a real arb cycle on testnet and lost 59% roundtrip, confirming testnet data is unreliable for strategy validation.

### 3. Gas is cheap but irrelevant

Base L2 gas: ~$0.004 per swap. Gas is not the bottleneck — **AMM fee structure** is.

### 4. Capital requirements

Even if a profitable spread existed, $3.70 capital at 0.1% net margin = $0.0037/trade. 
To reach ¥100k/month ($670) you'd need $670k capital at 0.1% daily return — or a fundamentally different approach.

## Data

### `arb_live_data.jsonl`
103 price snapshots from Base Sepolia + Base Mainnet, collected every 20s over 6.5 hours.

Each record contains:
```json
{
  "cycle": 1,
  "ts": "2026-04-17T06:56:41",
  "gas_sepolia": 6000000,
  "gas_base_mainnet": 6000000,
  "testnet": [
    {"amount": 10000000000000, "v2_out": 0, "v3_3000": 1587, "spread_pct": 142.66}
  ],
  "mainnet": [
    {"amount": 1000000000000000, "base_v3_3000": 2337353, "eth_v3_3000": null, "cross_chain_spread_pct": null}
  ]
}
```

### `arb_results.json`
17 test results from the multi-pattern verifier covering:
- V2/V3 price discovery
- Triangular arbitrage attempts
- Gas cost analysis
- Slippage testing across trade sizes
- MEV/sandwich analysis

### `mainnet_roundtrip.md`
Full roundtrip simulation on Base mainnet using read-only RPC calls (zero cost):
- Uniswap V3 → Aerodrome and reverse
- 4 trade sizes: 0.01, 0.1, 1.0, 10.0 ETH
- All result in loss

## Testnet Execution Proof

Real transactions executed on Base Sepolia:

| Step | TX Hash | Gas | Status |
|---|---|---|---|
| WETH→USDC (V2) | `0xc8028efc...` | 110,437 | SUCCESS |
| USDC approve | — | 35,885 | SUCCESS |
| USDC→WETH (V3) | `0x0aa1af21...` | 126,705 | SUCCESS |

**Result: 0.001 ETH in → 0.000410 ETH out (59% loss)**

## Architecture

```
arb_bot.py              — 10-pattern verification suite
arb_scanner.py          — Continuous pool scanner
arb_data_collector.py   — V1 data collector (V2 router issues)
arb_collector_v2.py     — V2 collector with reserve-based pricing + mainnet comparison
arb_live_data.jsonl     — Raw price data (103 records)
arb_results.json        — Multi-pattern test results
```

## What Would Actually Work

Based on this research, paths that *might* reach ¥100k/month:

| Strategy | Capital Needed | Expected Return | Feasibility |
|---|---|---|---|
| Flash loan arb (atomic, 1-tx) | $0 (gas only) | Variable | Medium — needs custom contract |
| CEX-DEX arb | $500+ | 2-5%/month | Medium — needs CEX API keys |
| MEV bundle (Flashbots) | $0 (gas only) | Variable | High skill required |
| New token listing arb | $100+ | High variance | Risky |
| **Arb bot SaaS** | $0 | Subscription | Most realistic path to ¥100k |

## Wallet

- Address: `0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6`
- Chain: Base Sepolia (84532)
- Balance: ~0.006 ETH + 0.004 WETH + 6550 USDC (testnet)

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Run the multi-pattern verifier
cd arb-research
python3 ../arb_bot.py

# Run continuous data collection (Base mainnet read-only)
python3 ../arb_collector_v2.py 100 20  # 100 cycles, 20s interval
```

## License

MIT — Use this data freely. If it saves you from losing money on unprofitable arb, that's the ROI.
