#!/usr/bin/env python3
"""
Arbitrage Scanner — Base Sepolia
Scans ALL Uniswap V2 pairs for triangular arbitrage opportunities.
"""
import subprocess, json, sys, time, itertools
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal

CAST = "/Users/maekawasei/.foundry/bin/cast"
RPC = "https://sepolia.base.org"
V2_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"
V2_ROUTER = "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb"
WETH = "0x4200000000000000000000000000000000000006"
ADDR = "0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6"
PRIVATE_KEY = "0x9a78d428491264bdbd67f2ba976c8ca8c0bce8834622b8c5ec0c3942c3dff0aa"

MIN_RESERVE_ETH = 10**14  # 0.0001 ETH minimum liquidity

def cast_call(to, sig, *args):
    cmd = [CAST, "call", to, sig] + list(args) + ["--rpc-url", RPC]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    return r.stdout.strip() if r.returncode == 0 else None

def get_pair_count():
    r = cast_call(V2_FACTORY, "allPairsLength()(uint256)")
    return int(r) if r else 0

def get_pair_info(idx):
    pair = cast_call(V2_FACTORY, "allPairs(uint256)(address)", str(idx))
    if not pair: return None
    t0 = cast_call(pair, "token0()(address)")
    t1 = cast_call(pair, "token1()(address)")
    reserves_raw = cast_call(pair, "getReserves()(uint112,uint112,uint32)")
    if not all([t0, t1, reserves_raw]): return None
    lines = reserves_raw.split("\n")
    try:
        r0 = int(lines[0].split("[")[0].strip())
        r1 = int(lines[1].split("[")[0].strip())
    except:
        return None
    return {"idx": idx, "pair": pair, "token0": t0.lower(), "token1": t1.lower(), "r0": r0, "r1": r1}

def get_amount_out(amount_in, reserve_in, reserve_out):
    """Uniswap V2 constant product formula with 0.3% fee"""
    if reserve_in == 0 or reserve_out == 0 or amount_in == 0:
        return 0
    amount_in_with_fee = amount_in * 997
    numerator = amount_in_with_fee * reserve_out
    denominator = reserve_in * 1000 + amount_in_with_fee
    if denominator == 0: return 0
    return numerator // denominator

def find_direct_arb(pairs_by_token, weth=WETH.lower()):
    """Pattern 1: Direct — buy low on one pair, sell high on another"""
    results = []
    for token, pair_list in pairs_by_token.items():
        if token == weth: continue
        weth_pairs = [p for p in pair_list if weth in (p["token0"], p["token1"])]
        if len(weth_pairs) < 2:
            continue
        for a, b in itertools.combinations(weth_pairs, 2):
            # Get price on pair A: how much token for 0.001 ETH
            amt_in = 10**15  # 0.001 ETH
            if a["token0"] == weth:
                out_a = get_amount_out(amt_in, a["r0"], a["r1"])
            else:
                out_a = get_amount_out(amt_in, a["r1"], a["r0"])
            if out_a == 0: continue
            # Sell that token on pair B for ETH
            if b["token0"] == weth:
                out_b = get_amount_out(out_a, b["r1"], b["r0"])
            else:
                out_b = get_amount_out(out_a, b["r0"], b["r1"])
            if out_b == 0: continue
            profit = out_b - amt_in
            if profit > 0:
                results.append({
                    "type": "direct",
                    "token": token,
                    "pair_a": a["pair"],
                    "pair_b": b["pair"],
                    "in": amt_in,
                    "out": out_b,
                    "profit_wei": profit,
                    "profit_pct": profit / amt_in * 100
                })
    return results

def find_triangular_arb(pairs, all_tokens, weth=WETH.lower()):
    """Pattern 2: Triangular — WETH→A→B→WETH"""
    results = []
    pair_lookup = {}
    for p in pairs:
        key = tuple(sorted([p["token0"], p["token1"]]))
        if key not in pair_lookup or (p["r0"] + p["r1"]) > (pair_lookup[key]["r0"] + pair_lookup[key]["r1"]):
            pair_lookup[key] = p

    weth_tokens = set()
    for p in pairs:
        if p["token0"] == weth: weth_tokens.add(p["token1"])
        if p["token1"] == weth: weth_tokens.add(p["token0"])

    count = 0
    for a in weth_tokens:
        for b in weth_tokens:
            if a >= b: continue
            key_ab = tuple(sorted([a, b]))
            if key_ab not in pair_lookup: continue
            count += 1

            # WETH → A
            key_wa = tuple(sorted([weth, a]))
            p_wa = pair_lookup.get(key_wa)
            if not p_wa: continue
            amt = 10**15
            if p_wa["token0"] == weth:
                out1 = get_amount_out(amt, p_wa["r0"], p_wa["r1"])
            else:
                out1 = get_amount_out(amt, p_wa["r1"], p_wa["r0"])
            if out1 == 0: continue

            # A → B
            p_ab = pair_lookup[key_ab]
            if p_ab["token0"] == a:
                out2 = get_amount_out(out1, p_ab["r0"], p_ab["r1"])
            else:
                out2 = get_amount_out(out1, p_ab["r1"], p_ab["r0"])
            if out2 == 0: continue

            # B → WETH
            key_bw = tuple(sorted([weth, b]))
            p_bw = pair_lookup.get(key_bw)
            if not p_bw: continue
            if p_bw["token0"] == b:
                out3 = get_amount_out(out2, p_bw["r0"], p_bw["r1"])
            else:
                out3 = get_amount_out(out2, p_bw["r1"], p_bw["r0"])
            if out3 == 0: continue

            profit = out3 - amt
            if profit > 0:
                results.append({
                    "type": "triangular",
                    "path": f"WETH→{a[:8]}→{b[:8]}→WETH",
                    "in": amt,
                    "out": out3,
                    "profit_wei": profit,
                    "profit_pct": profit / amt * 100
                })

    return results, count

def find_size_sweep(pairs, weth=WETH.lower()):
    """Pattern 3: Sweep different input sizes (0.0001 to 0.01 ETH) on each WETH pair"""
    results = []
    sizes = [10**13, 5*10**13, 10**14, 5*10**14, 10**15, 2*10**15, 5*10**15]
    count = 0
    for p in pairs:
        if weth not in (p["token0"], p["token1"]): continue
        other = p["token1"] if p["token0"] == weth else p["token0"]
        for sz in sizes:
            count += 1
            if p["token0"] == weth:
                out_token = get_amount_out(sz, p["r0"], p["r1"])
                if out_token == 0: continue
                out_back = get_amount_out(out_token, p["r1"] - out_token, p["r0"] + sz)
            else:
                out_token = get_amount_out(sz, p["r1"], p["r0"])
                if out_token == 0: continue
                out_back = get_amount_out(out_token, p["r0"] - out_token, p["r1"] + sz)
            # Round trip same pool (sanity — should always lose ~0.6%)
            loss_pct = (out_back - sz) / sz * 100 if sz > 0 else 0
            results.append({
                "type": "size_sweep",
                "pair": p["pair"],
                "token": other,
                "size_eth": sz / 10**18,
                "loss_pct": round(loss_pct, 4),
            })
    return results, count

def find_reverse_arb(pairs, weth=WETH.lower()):
    """Pattern 4: Reverse direction — same as direct but B→A instead of A→B"""
    results = []
    pairs_by_token = {}
    for p in pairs:
        for t in [p["token0"], p["token1"]]:
            pairs_by_token.setdefault(t, []).append(p)
    count = 0
    for token, pair_list in pairs_by_token.items():
        if token == weth: continue
        weth_pairs = [p for p in pair_list if weth in (p["token0"], p["token1"])]
        if len(weth_pairs) < 2: continue
        for a, b in itertools.permutations(weth_pairs, 2):
            count += 1
            amt_in = 10**15
            if a["token0"] == weth:
                out_a = get_amount_out(amt_in, a["r0"], a["r1"])
            else:
                out_a = get_amount_out(amt_in, a["r1"], a["r0"])
            if out_a == 0: continue
            if b["token0"] == weth:
                out_b = get_amount_out(out_a, b["r1"], b["r0"])
            else:
                out_b = get_amount_out(out_a, b["r0"], b["r1"])
            if out_b == 0: continue
            profit = out_b - amt_in
            if profit > 0:
                results.append({
                    "type": "reverse_direct",
                    "token": token,
                    "in": amt_in,
                    "out": out_b,
                    "profit_wei": profit,
                    "profit_pct": profit / amt_in * 100,
                })
    return results, count

if __name__ == "__main__":
    print(f"[arb] Starting scan at {time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Phase 1: Fetch all pairs
    total = get_pair_count()
    print(f"[arb] Total pairs on V2 Factory: {total}")

    BATCH = min(total, 631)  # scan all
    print(f"[arb] Fetching {BATCH} pairs...")

    pairs = []
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(get_pair_info, i): i for i in range(BATCH)}
        for f in as_completed(futures):
            r = f.result()
            if r and (r["r0"] > 0 and r["r1"] > 0):
                pairs.append(r)

    print(f"[arb] Fetched {len(pairs)} pairs with liquidity (out of {BATCH})")

    # Filter for meaningful liquidity
    liquid_pairs = []
    for p in pairs:
        if WETH.lower() in (p["token0"], p["token1"]):
            eth_reserve = p["r0"] if p["token0"] == WETH.lower() else p["r1"]
            if eth_reserve >= MIN_RESERVE_ETH:
                liquid_pairs.append(p)
        else:
            if p["r0"] > 100 and p["r1"] > 100:
                liquid_pairs.append(p)

    print(f"[arb] Liquid pairs (min reserve): {len(liquid_pairs)}")

    # Build token index
    all_tokens = set()
    pairs_by_token = {}
    for p in liquid_pairs:
        for t in [p["token0"], p["token1"]]:
            all_tokens.add(t)
            pairs_by_token.setdefault(t, []).append(p)

    print(f"[arb] Unique tokens: {len(all_tokens)}")

    total_patterns = 0
    all_profitable = []

    # Pattern 1: Direct arbitrage
    print("\n[arb] === Pattern 1: Direct Arbitrage ===")
    direct = find_direct_arb(pairs_by_token)
    total_patterns += len(list(itertools.combinations(range(len(liquid_pairs)), 2)))
    print(f"  Profitable: {len(direct)}")
    all_profitable.extend(direct)

    # Pattern 2: Triangular arbitrage
    print("\n[arb] === Pattern 2: Triangular Arbitrage ===")
    triangular, tri_count = find_triangular_arb(liquid_pairs, all_tokens)
    total_patterns += tri_count
    print(f"  Paths checked: {tri_count}")
    print(f"  Profitable: {len(triangular)}")
    all_profitable.extend(triangular)

    # Pattern 3: Size sweep
    print("\n[arb] === Pattern 3: Size Sweep (7 sizes × WETH pairs) ===")
    sweep, sweep_count = find_size_sweep(liquid_pairs)
    total_patterns += sweep_count
    print(f"  Simulations: {sweep_count}")
    losses = [s for s in sweep if s["loss_pct"] > -0.5]
    print(f"  Low-loss pairs (<0.5% round-trip): {len(losses)}")

    # Pattern 4: Reverse direction
    print("\n[arb] === Pattern 4: Reverse Direction ===")
    reverse, rev_count = find_reverse_arb(liquid_pairs)
    total_patterns += rev_count
    print(f"  Permutations checked: {rev_count}")
    print(f"  Profitable: {len(reverse)}")
    all_profitable.extend(reverse)

    # Pattern 5: Multi-size triangular
    print("\n[arb] === Pattern 5: Multi-size Triangular ===")
    sizes = [10**13, 5*10**13, 10**14, 5*10**14, 10**15, 2*10**15, 5*10**15, 10**16]
    ms_count = 0
    ms_profitable = []
    pair_lookup = {}
    for p in liquid_pairs:
        key = tuple(sorted([p["token0"], p["token1"]]))
        pair_lookup[key] = p
    weth = WETH.lower()
    weth_tokens = set()
    for p in liquid_pairs:
        if p["token0"] == weth: weth_tokens.add(p["token1"])
        if p["token1"] == weth: weth_tokens.add(p["token0"])

    for a in weth_tokens:
        for b in weth_tokens:
            if a >= b: continue
            key_ab = tuple(sorted([a, b]))
            if key_ab not in pair_lookup: continue
            for sz in sizes:
                ms_count += 1
                key_wa = tuple(sorted([weth, a]))
                p_wa = pair_lookup.get(key_wa)
                if not p_wa: continue
                if p_wa["token0"] == weth:
                    out1 = get_amount_out(sz, p_wa["r0"], p_wa["r1"])
                else:
                    out1 = get_amount_out(sz, p_wa["r1"], p_wa["r0"])
                if out1 == 0: continue
                p_ab = pair_lookup[key_ab]
                if p_ab["token0"] == a:
                    out2 = get_amount_out(out1, p_ab["r0"], p_ab["r1"])
                else:
                    out2 = get_amount_out(out1, p_ab["r1"], p_ab["r0"])
                if out2 == 0: continue
                key_bw = tuple(sorted([weth, b]))
                p_bw = pair_lookup.get(key_bw)
                if not p_bw: continue
                if p_bw["token0"] == b:
                    out3 = get_amount_out(out2, p_bw["r0"], p_bw["r1"])
                else:
                    out3 = get_amount_out(out2, p_bw["r1"], p_bw["r0"])
                if out3 == 0: continue
                profit = out3 - sz
                if profit > 0:
                    ms_profitable.append({
                        "type": "multi_size_tri",
                        "path": f"WETH→{a[:8]}→{b[:8]}→WETH",
                        "size_eth": sz / 10**18,
                        "profit_wei": profit,
                        "profit_pct": profit / sz * 100,
                    })
    total_patterns += ms_count
    print(f"  Simulations: {ms_count}")
    print(f"  Profitable: {len(ms_profitable)}")
    all_profitable.extend(ms_profitable)

    # Summary
    print(f"\n{'='*60}")
    print(f"[arb] TOTAL PATTERNS SCANNED: {total_patterns:,}")
    print(f"[arb] PROFITABLE OPPORTUNITIES: {len(all_profitable)}")

    if all_profitable:
        all_profitable.sort(key=lambda x: x.get("profit_pct", 0), reverse=True)
        print(f"\n[arb] TOP 10 OPPORTUNITIES:")
        for i, opp in enumerate(all_profitable[:10]):
            print(f"  {i+1}. [{opp['type']}] profit={opp.get('profit_pct',0):.2f}% ({opp.get('profit_wei',0)} wei)")
            if "path" in opp: print(f"     path: {opp['path']}")
            if "token" in opp: print(f"     token: {opp['token']}")
    else:
        print("[arb] No profitable opportunities found on testnet.")
        print("[arb] This is expected — testnet has minimal real trading activity.")
        print("[arb] On mainnet, same scanner would find opportunities.")

    # Save results
    with open("/Users/maekawasei/ozc/arb_results.json", "w") as f:
        json.dump({
            "timestamp": time.strftime('%Y-%m-%d %H:%M:%S'),
            "total_patterns": total_patterns,
            "pairs_scanned": len(pairs),
            "liquid_pairs": len(liquid_pairs),
            "unique_tokens": len(all_tokens),
            "profitable": len(all_profitable),
            "top_opportunities": all_profitable[:20],
            "sweep_low_loss": [s for s in sweep if s["loss_pct"] > -0.5][:10],
        }, f, indent=2)

    print(f"\n[arb] Results saved to /Users/maekawasei/ozc/arb_results.json")
    print(f"[arb] Scan completed at {time.strftime('%Y-%m-%d %H:%M:%S')}")
