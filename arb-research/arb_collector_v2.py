#!/usr/bin/env python3
"""Arb Data Collector V2 — Fixed V2 parsing + reserve-based pricing + mainnet comparison"""
import subprocess, json, time, os, sys, math
from datetime import datetime

BASE_RPC = "https://sepolia.base.org"
ETH_MAINNET_RPC = "https://eth.llamarpc.com"
BASE_MAINNET_RPC = "https://mainnet.base.org"
CAST = os.path.expanduser("~/.foundry/bin/cast")
PK = "0x9a78d428491264bdbd67f2ba976c8ca8c0bce8834622b8c5ec0c3942c3dff0aa"
ADDR = "0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6"

WETH = "0x4200000000000000000000000000000000000006"
USDC_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
V2_ROUTER = "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb"
V2_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"
V3_QUOTER = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27"
WETH_USDC_V2_PAIR = "0x45383e82f90Ff65391102D460B34E75030b0eB2b"

# Mainnet addresses for comparison data
MAINNET_WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
MAINNET_USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
BASE_MAINNET_WETH = "0x4200000000000000000000000000000000000006"
BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
# Uniswap V3 Quoter on mainnet
MAINNET_V3_QUOTER = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e"
# Aerodrome on Base mainnet
AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"

DATA_FILE = "/Users/maekawasei/ozc/arb_live_data.jsonl"

def cc(to, sig, *args, rpc=BASE_RPC):
    cmd = [CAST, "call", to, sig] + list(args) + ["--rpc-url", rpc]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else None
    except: return None

def pa(raw):
    if not raw: return 0
    try: return int(raw.split("[")[0].strip())
    except: return 0

def get_gas(rpc=BASE_RPC):
    try:
        r = subprocess.run([CAST, "gas-price", "--rpc-url", rpc], capture_output=True, text=True, timeout=10)
        return int(r.stdout.strip()) if r.returncode == 0 else 0
    except: return 0

def v2_quote(tin, tout, amt, rpc=BASE_RPC, router=V2_ROUTER):
    raw = cc(router, "getAmountsOut(uint256,address[])(uint256[])", str(amt), f"[{tin},{tout}]", rpc=rpc)
    if not raw: return None
    lines = raw.strip().split("\n")
    return pa(lines[-1]) if len(lines) >= 2 else pa(lines[0])

def v3_quote(tin, tout, amt, fee=3000, rpc=BASE_RPC, quoter=V3_QUOTER):
    raw = cc(quoter,
        "quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)",
        f"({tin},{tout},{amt},{fee},0)", rpc=rpc)
    if not raw: return None
    return pa(raw.split("\n")[0])

def v2_reserves(pair, rpc=BASE_RPC):
    raw = cc(pair, "getReserves()(uint112,uint112,uint32)", rpc=rpc)
    if not raw: return 0, 0
    parts = raw.strip().split("\n")
    return pa(parts[0]), pa(parts[1]) if len(parts) > 1 else 0

def calc_v2_output(amount_in, reserve_in, reserve_out):
    """Calculate Uniswap V2 output amount with 0.3% fee"""
    if reserve_in == 0 or reserve_out == 0: return 0
    amount_with_fee = amount_in * 997
    numerator = amount_with_fee * reserve_out
    denominator = reserve_in * 1000 + amount_with_fee
    return numerator // denominator if denominator > 0 else 0

def collect_cycle(cycle):
    ts = datetime.now().isoformat()
    gas_sepolia = get_gas(BASE_RPC)
    gas_base_mainnet = get_gas(BASE_MAINNET_RPC)

    record = {"cycle": cycle, "ts": ts, "gas_sepolia": gas_sepolia, "gas_base_mainnet": gas_base_mainnet}

    sizes = [10**13, 5*10**13, 10**14, 5*10**14, 10**15, 5*10**15]

    # === TESTNET DATA ===
    # V2 reserves
    r0, r1 = v2_reserves(WETH_USDC_V2_PAIR)
    # token0=USDC, token1=WETH for this pair
    record["v2_reserve_usdc"] = r0
    record["v2_reserve_weth"] = r1

    testnet_data = []
    for amt in sizes:
        d = {"amount": amt}

        # V2 via router
        d["v2_out"] = v2_quote(WETH, USDC_SEPOLIA, amt)

        # V2 via reserve calc (WETH is token1, USDC is token0)
        d["v2_calc_out"] = calc_v2_output(amt, r1, r0) if r1 > 0 else 0

        # V3 quotes (multiple fee tiers)
        for fee in [500, 3000, 10000]:
            d[f"v3_{fee}"] = v3_quote(WETH, USDC_SEPOLIA, amt, fee)

        # Spread analysis
        v2 = d["v2_out"] or d["v2_calc_out"]
        v3 = d.get("v3_3000", 0) or 0
        if v2 and v3 and v2 > 0 and v3 > 0:
            d["spread_pct"] = round(abs(v3 - v2) / min(v2, v3) * 100, 4)
            d["arb_dir"] = "v2→v3" if v3 > v2 else "v3→v2"
            d["gross_usdc"] = abs(v3 - v2)
            # Gas cost in USDC (2 swaps)
            gas_cost_eth = gas_sepolia * 300000  # 2 swaps
            d["gas_usdc"] = round(gas_cost_eth * v2 / amt, 2) if amt > 0 else 0
            d["net_usdc"] = d["gross_usdc"] - d["gas_usdc"]
            d["profitable"] = d["net_usdc"] > 0

        testnet_data.append(d)
    record["testnet"] = testnet_data

    # === MAINNET PRICE DATA (read-only, for strategy calibration) ===
    mainnet_data = []
    for amt in [10**15, 10**16, 10**17]:  # 0.001, 0.01, 0.1 ETH
        md = {"amount": amt}

        # Base mainnet V3 WETH/USDC
        md["base_v3_3000"] = v3_quote(BASE_MAINNET_WETH, BASE_MAINNET_USDC, amt, 3000,
                                       rpc=BASE_MAINNET_RPC, quoter="0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a")
        md["base_v3_500"] = v3_quote(BASE_MAINNET_WETH, BASE_MAINNET_USDC, amt, 500,
                                      rpc=BASE_MAINNET_RPC, quoter="0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a")

        # Eth mainnet V3 WETH/USDC
        md["eth_v3_3000"] = v3_quote(MAINNET_WETH, MAINNET_USDC, amt, 3000,
                                      rpc=ETH_MAINNET_RPC, quoter=MAINNET_V3_QUOTER)

        # Cross-chain spread
        base_price = md.get("base_v3_500") or md.get("base_v3_3000")
        eth_price = md.get("eth_v3_3000")
        if base_price and eth_price and base_price > 0 and eth_price > 0:
            md["cross_chain_spread_pct"] = round(abs(base_price - eth_price) / min(base_price, eth_price) * 100, 4)

        mainnet_data.append(md)
    record["mainnet"] = mainnet_data

    return record

def main():
    max_cycles = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    print(f"Arb Collector V2 — {max_cycles} cycles, {interval}s interval")
    print(f"Output: {DATA_FILE}")

    for c in range(1, max_cycles + 1):
        try:
            t0 = time.time()
            rec = collect_cycle(c)
            elapsed = time.time() - t0

            # Append to file
            with open(DATA_FILE, "a") as f:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")

            # Print summary
            print(f"[{c}/{max_cycles}] {rec['ts'][:19]} ({elapsed:.1f}s) gas={rec['gas_sepolia']}", end="")
            for d in rec.get("testnet", []):
                if d.get("spread_pct"):
                    flag = " $" if d.get("profitable") else ""
                    print(f" | {d['amount']/1e18:.4f}ETH sp={d['spread_pct']}%{flag}", end="")
            # Mainnet cross-chain
            for md in rec.get("mainnet", []):
                if md.get("cross_chain_spread_pct"):
                    print(f" | XC={md['cross_chain_spread_pct']}%", end="")
            print()

            if c < max_cycles:
                wait = max(0, interval - elapsed)
                if wait > 0: time.sleep(wait)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"[{c}] Error: {e}")
            time.sleep(5)

    # Final stats
    try:
        with open(DATA_FILE) as f:
            lines = f.readlines()
        print(f"\nTotal records: {len(lines)}")
    except:
        pass

if __name__ == "__main__":
    main()
