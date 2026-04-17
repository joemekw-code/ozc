# Base Mainnet Roundtrip Arbitrage Simulation

**Date**: 2026-04-17  
**Method**: Read-only RPC calls to Base mainnet (zero cost)  
**Strategy**: Sell WETH→USDC on Uniswap V3 (higher price), Buy WETH←USDC on Aerodrome (lower price)

## Pool Addresses

| DEX | Pool | Type |
|---|---|---|
| Uniswap V3 | fee tier 500 (0.05%) | Concentrated liquidity |
| Aerodrome | `0xcDAC0d6c6C59727a65F871236188350531885C43` | Volatile (x*y=k) |

## Aerodrome Pool Reserves

```
WETH:  2,621.08 ETH
USDC:  6,122,048.23 USDC
Price: ~2,336 USDC/ETH
```

## One-Way Spread (WETH → USDC)

| Trade Size | Aerodrome (USDC) | Uniswap V3 (USDC) | Spread |
|---|---|---|---|
| 0.01 ETH | 23,286,809 | 23,364,840 | **0.34%** (V3 higher) |
| 0.10 ETH | 232,860,181 | 233,647,691 | **0.34%** |
| 1.00 ETH | 2,327,804,425 | 2,336,405,698 | **0.37%** |

## Roundtrip P&L (V3 sell → Aerodrome buy back)

| Trade Size | V3→USDC | Aero USDC→WETH | Gas (2 swaps) | Net Profit | % |
|---|---|---|---|---|---|
| 0.01 ETH | 23.36 USDC | 0.009971 ETH | $0.004 | **-$0.07** | -0.031% |
| 0.10 ETH | 233.60 USDC | 0.099709 ETH | $0.004 | **-$0.68** | -0.293% |
| 1.00 ETH | 2,335.92 USDC | 0.996714 ETH | $0.004 | **-$7.68** | -0.329% |
| 10.0 ETH | 23,352 USDC | 9.93013 ETH | $0.004 | **-$163** | -0.699% |

## Why All Roundtrips Lose

```
V3 sell fee:      0.05% (fee tier 500)
Aerodrome fee:    0.30% (volatile pool)
Total fees:       0.35%
One-way spread:   0.34%

Net: 0.34% - 0.35% = -0.01% (before price impact)
Price impact adds: -0.02% to -0.35% depending on size
```

**The spread (0.34%) is smaller than the combined fees (0.35%).** This is the fundamental reason arb is unprofitable.

## V3 Internal Fee Tier Arbitrage

| Direction | Fee In | Fee Out | Roundtrip P&L |
|---|---|---|---|
| 500 → 3000 | 0.05% | 0.30% | **-0.24%** |
| 500 → 10000 | 0.05% | 1.00% | **-1.18%** |

Same conclusion: fee structure prevents profitable roundtrips.

## Conclusion

DEX-DEX arbitrage on Base mainnet WETH/USDC is **structurally unprofitable** at current spread levels. The one-way price difference exists (Aerodrome is 0.34% cheaper than V3) but AMM fees on the return leg eliminate the margin.

For arb to become profitable, you'd need:
1. A spread > 0.35% that persists long enough to execute (currently doesn't)
2. A fee-free or very low-fee DEX on the return leg
3. Flash loan + atomic execution to eliminate the return leg entirely
4. Or a completely different pair with wider spreads
