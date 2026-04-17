#!/usr/bin/env python3
"""
Arbitrage Real Data Collector — Continuous price monitoring & opportunity logging.
Collects V2/V3 price data, spread calculations, gas costs, and trade simulations.
Runs continuously, logging every cycle to build a dataset for mainnet strategy.
"""
import subprocess, json, time, os, sys
from datetime import datetime

BASE_RPC = "https://sepolia.base.org"
CAST = os.path.expanduser("~/.foundry/bin/cast")
PRIVATE_KEY = "0x9a78d428491264bdbd67f2ba976c8ca8c0bce8834622b8c5ec0c3942c3dff0aa"
ADDR = "0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6"

# Tokens
WETH = "0x4200000000000000000000000000000000000006"
USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# DEXes
V2_ROUTER = "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb"
V2_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"
V3_QUOTER = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27"
V3_ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"

# Top WETH pairs from scan (with liquidity)
TOP_TOKENS = {
    "USDC": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    "TokenA": "0xBc264F02Ed310B14e44a094DBe3Ac96f26F29CE0",  # Pair 0, good liquidity
}

DATA_FILE = "/Users/maekawasei/ozc/arb_price_data.jsonl"
SUMMARY_FILE = "/Users/maekawasei/ozc/arb_summary.json"
TRADE_LOG = "/Users/maekawasei/ozc/arb_trades.jsonl"

def cast_call(to, sig, *args):
    cmd = [CAST, "call", to, sig] + list(args) + ["--rpc-url", BASE_RPC]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return r.stdout.strip() if r.returncode == 0 else None
    except:
        return None

def cast_send(to, sig, *args, value=None, gas_limit=None):
    cmd = [CAST, "send", to, sig] + list(args) + ["--rpc-url", BASE_RPC, "--private-key", PRIVATE_KEY]
    if value: cmd += ["--value", value]
    if gas_limit: cmd += ["--gas-limit", str(gas_limit)]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return r.stdout.strip(), r.returncode == 0
    except:
        return "", False

def get_gas_price():
    try:
        r = subprocess.run([CAST, "gas-price", "--rpc-url", BASE_RPC], capture_output=True, text=True, timeout=10)
        return int(r.stdout.strip()) if r.returncode == 0 else 6000000
    except:
        return 6000000

def parse_amount(raw):
    """Parse cast output like '65469 [6.546e4]' to int"""
    if not raw: return 0
    try:
        return int(raw.split("[")[0].strip())
    except:
        return 0

def get_v2_quote(token_in, token_out, amount_in):
    result = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])",
                       str(amount_in), f"[{token_in},{token_out}]")
    if not result: return None
    lines = result.strip().split("\n")
    if len(lines) >= 2:
        return parse_amount(lines[-1])
    return None

def get_v3_quote(token_in, token_out, amount_in, fee=3000):
    result = cast_call(V3_QUOTER,
        "quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)",
        f"({token_in},{token_out},{amount_in},{fee},0)")
    if not result:
        return None
    return parse_amount(result.split("\n")[0])

def get_v2_reserves(pair_addr):
    result = cast_call(pair_addr, "getReserves()(uint112,uint112,uint32)")
    if not result: return None, None
    parts = result.strip().split("\n")
    r0 = parse_amount(parts[0]) if parts else 0
    r1 = parse_amount(parts[1]) if len(parts) > 1 else 0
    return r0, r1

def collect_price_snapshot(sizes):
    """Collect prices across V2/V3 for multiple trade sizes"""
    ts = datetime.now().isoformat()
    gas_price = get_gas_price()
    swap_gas_cost = gas_price * 150000  # wei, typical V2 swap

    snapshot = {
        "timestamp": ts,
        "gas_price_wei": gas_price,
        "swap_gas_cost_wei": swap_gas_cost,
        "pairs": {}
    }

    for size_label, amount in sizes.items():
        pair_data = {"amount_in_wei": amount}

        # V2: WETH → USDC
        v2_out = get_v2_quote(WETH, USDC, amount)
        pair_data["v2_weth_to_usdc"] = v2_out

        # V3: WETH → USDC (fee tiers: 500, 3000, 10000)
        for fee in [500, 3000, 10000]:
            v3_out = get_v3_quote(WETH, USDC, amount, fee)
            pair_data[f"v3_fee{fee}_weth_to_usdc"] = v3_out

        # Reverse: V2 USDC → WETH
        if v2_out and v2_out > 0:
            v2_reverse = get_v2_quote(USDC, WETH, v2_out)
            pair_data["v2_usdc_to_weth_roundtrip"] = v2_reverse

        # Calculate spreads
        if v2_out and pair_data.get("v3_fee3000_weth_to_usdc"):
            v3_3000 = pair_data["v3_fee3000_weth_to_usdc"]
            if v2_out > 0 and v3_3000 > 0:
                # Spread: buy on cheaper, sell on expensive
                spread_pct = abs(v3_3000 - v2_out) / min(v2_out, v3_3000) * 100
                pair_data["v2_v3_spread_pct"] = round(spread_pct, 4)

                # If V3 gives more USDC: buy WETH on V2 (sell USDC), sell on V3 (buy USDC)
                # If V2 gives more USDC: buy WETH on V3, sell on V2
                if v3_3000 > v2_out:
                    pair_data["arb_direction"] = "buy_v2_sell_v3"
                    pair_data["arb_profit_usdc"] = v3_3000 - v2_out
                else:
                    pair_data["arb_direction"] = "buy_v3_sell_v2"
                    pair_data["arb_profit_usdc"] = v2_out - v3_3000

                # Net profit after gas (convert gas to USDC equivalent)
                eth_per_usdc = amount / v2_out if v2_out > 0 else 0
                gas_cost_usdc = swap_gas_cost / eth_per_usdc if eth_per_usdc > 0 else 999999
                pair_data["gas_cost_usdc_equiv"] = round(gas_cost_usdc, 2)
                pair_data["net_profit_usdc"] = round(pair_data["arb_profit_usdc"] - gas_cost_usdc * 2, 2)  # 2 swaps
                pair_data["profitable"] = pair_data["net_profit_usdc"] > 0

        snapshot["pairs"][size_label] = pair_data

    return snapshot

def execute_real_trade(direction, amount_wei):
    """Execute an actual arb trade on testnet and log results"""
    trade = {
        "timestamp": datetime.now().isoformat(),
        "direction": direction,
        "amount_wei": amount_wei,
        "steps": []
    }

    if direction == "buy_v2_sell_v3":
        # Step 1: Swap WETH → USDC on V2
        deadline = str(int(time.time()) + 600)
        out, ok = cast_send(V2_ROUTER,
            "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
            str(amount_wei), "0", f"[{WETH},{USDC}]", ADDR, deadline,
            gas_limit=300000)
        trade["steps"].append({"dex": "v2", "action": "WETH→USDC", "success": ok, "tx": out[:100] if out else ""})

        if ok:
            # Check USDC balance
            usdc_bal = cast_call(USDC, "balanceOf(address)(uint256)", ADDR)
            usdc_amount = parse_amount(usdc_bal) if usdc_bal else 0
            trade["usdc_received"] = usdc_amount

            # Step 2: Approve USDC to V3 Router
            cast_send(USDC, "approve(address,uint256)", V3_ROUTER,
                     "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                     gas_limit=100000)

            # Step 3: Swap USDC → WETH on V3
            # exactInputSingle params
            out2, ok2 = cast_send(V3_ROUTER,
                "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))",
                f"({USDC},{WETH},3000,{ADDR},{usdc_amount},0,0)",
                gas_limit=300000)
            trade["steps"].append({"dex": "v3", "action": "USDC→WETH", "success": ok2, "tx": out2[:100] if out2 else ""})

    trade["completed"] = all(s["success"] for s in trade["steps"])

    # Log trade
    with open(TRADE_LOG, "a") as f:
        f.write(json.dumps(trade, ensure_ascii=False) + "\n")

    return trade

def run_collection_cycle(cycle_num, sizes):
    """Run one full data collection cycle"""
    print(f"\n--- Cycle {cycle_num} @ {datetime.now().strftime('%H:%M:%S')} ---")

    snapshot = collect_price_snapshot(sizes)

    # Log to JSONL
    with open(DATA_FILE, "a") as f:
        f.write(json.dumps(snapshot, ensure_ascii=False) + "\n")

    # Print key metrics
    for size_label, data in snapshot["pairs"].items():
        v2 = data.get("v2_weth_to_usdc", 0)
        v3 = data.get("v3_fee3000_weth_to_usdc", 0)
        spread = data.get("v2_v3_spread_pct", 0)
        net = data.get("net_profit_usdc", 0)
        profitable = data.get("profitable", False)
        direction = data.get("arb_direction", "?")

        flag = " *** PROFITABLE ***" if profitable else ""
        print(f"  {size_label}: V2={v2} V3={v3} spread={spread}% net={net} USDC {direction}{flag}")

    # Execute trade if profitable opportunity found
    for size_label, data in snapshot["pairs"].items():
        if data.get("profitable") and data.get("net_profit_usdc", 0) > 0:
            print(f"  >> EXECUTING TRADE: {size_label} {data['arb_direction']}")
            trade = execute_real_trade(data["arb_direction"], data["amount_in_wei"])
            print(f"  >> Trade result: {'SUCCESS' if trade['completed'] else 'FAILED'}")

    return snapshot

def main():
    print("=" * 60)
    print("ARBITRAGE DATA COLLECTOR — Base Sepolia")
    print(f"Started: {datetime.now().isoformat()}")
    print(f"Data file: {DATA_FILE}")
    print("=" * 60)

    sizes = {
        "micro":  10**13,      # 0.00001 ETH
        "tiny":   10**14,      # 0.0001 ETH
        "small":  10**15,      # 0.001 ETH (~$2)
        "medium": 5 * 10**15,  # 0.005 ETH (~$10)
    }

    # Ensure WETH approved to both routers
    print("Approving WETH to V2 Router...")
    cast_send(WETH, "approve(address,uint256)", V2_ROUTER,
             "115792089237316195423570985008687907853269984665640564039457584007913129639935",
             gas_limit=100000)
    print("Approving WETH to V3 Router...")
    cast_send(WETH, "approve(address,uint256)", V3_ROUTER,
             "115792089237316195423570985008687907853269984665640564039457584007913129639935",
             gas_limit=100000)
    print("Approving USDC to V2 Router...")
    cast_send(USDC, "approve(address,uint256)", V2_ROUTER,
             "115792089237316195423570985008687907853269984665640564039457584007913129639935",
             gas_limit=100000)
    print("Approving USDC to V3 Router...")
    cast_send(USDC, "approve(address,uint256)", V3_ROUTER,
             "115792089237316195423570985008687907853269984665640564039457584007913129639935",
             gas_limit=100000)

    max_cycles = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    interval = int(sys.argv[2]) if len(sys.argv) > 2 else 30  # seconds between cycles

    all_snapshots = []
    profitable_count = 0
    total_net_profit = 0

    for cycle in range(1, max_cycles + 1):
        try:
            snapshot = run_collection_cycle(cycle, sizes)
            all_snapshots.append(snapshot)

            # Track profitability
            for data in snapshot["pairs"].values():
                if data.get("profitable"):
                    profitable_count += 1
                    total_net_profit += data.get("net_profit_usdc", 0)

            # Update summary every 10 cycles
            if cycle % 10 == 0:
                summary = {
                    "total_cycles": cycle,
                    "profitable_opportunities": profitable_count,
                    "total_net_profit_usdc": round(total_net_profit, 4),
                    "avg_spread_pct": 0,
                    "last_updated": datetime.now().isoformat()
                }
                spreads = [d.get("v2_v3_spread_pct", 0) for s in all_snapshots[-10:]
                          for d in s["pairs"].values() if d.get("v2_v3_spread_pct")]
                if spreads:
                    summary["avg_spread_pct"] = round(sum(spreads) / len(spreads), 4)

                with open(SUMMARY_FILE, "w") as f:
                    json.dump(summary, f, indent=2)
                print(f"\n  [Summary] Cycles: {cycle} | Profitable: {profitable_count} | Net: {total_net_profit:.4f} USDC")

            if cycle < max_cycles:
                time.sleep(interval)

        except KeyboardInterrupt:
            print("\nStopped by user")
            break
        except Exception as e:
            print(f"  Error in cycle {cycle}: {e}")
            time.sleep(5)

    # Final summary
    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print(f"Total cycles: {len(all_snapshots)}")
    print(f"Profitable opportunities: {profitable_count}")
    print(f"Total net profit (simulated): {total_net_profit:.4f} USDC")
    print(f"Data saved to: {DATA_FILE}")
    print("=" * 60)

if __name__ == "__main__":
    main()
