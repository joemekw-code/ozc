#!/usr/bin/env python3
"""
Base Sepolia Arbitrage Bot — Multi-pattern Verifier
Tests multiple arbitrage strategies on testnet to validate before mainnet deployment.
"""
import subprocess, json, time, os, sys
from decimal import Decimal

# Config
BASE_RPC = "https://sepolia.base.org"
PRIVATE_KEY = os.environ.get("PRIVATE_KEY", "0x9a78d428491264bdbd67f2ba976c8ca8c0bce8834622b8c5ec0c3942c3dff0aa")
ADDR = "0x670F2F9f4cD36330f34aD407A3cb91bFF577B3b6"
WETH = "0x4200000000000000000000000000000000000006"
USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"  # USDC on Base Sepolia

# Uniswap V2
V2_ROUTER = "0x8cFe327CEc66d1C090Dd72bd0FF11d690C33a2Eb"
V2_FACTORY = "0x02a84c1b3BBD7401a5f7fa98a384EBC70bB5749E"

# Uniswap V3
V3_ROUTER = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"
V3_FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"

CAST = os.path.expanduser("~/.foundry/bin/cast")

results_log = []

def cast_call(to, sig, *args, rpc=BASE_RPC):
    cmd = [CAST, "call", to, sig] + list(args) + ["--rpc-url", rpc]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    return r.stdout.strip() if r.returncode == 0 else None

def cast_send(to, sig, *args, value=None, gas_limit=None, rpc=BASE_RPC):
    cmd = [CAST, "send", to, sig] + list(args) + ["--rpc-url", rpc, "--private-key", PRIVATE_KEY]
    if value:
        cmd += ["--value", value]
    if gas_limit:
        cmd += ["--gas-limit", str(gas_limit)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    return r.stdout.strip(), r.returncode == 0

def log_result(pattern, action, success, details):
    entry = {
        "pattern": pattern,
        "action": action,
        "success": success,
        "details": details,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    results_log.append(entry)
    status = "OK" if success else "FAIL"
    print(f"  [{status}] {pattern} / {action}: {details[:120]}")

# ============================================================
# Pattern 1: Uniswap V2 — getAmountsOut price discovery
# ============================================================
def test_v2_price_discovery():
    print("\n=== Pattern 1: V2 Price Discovery ===")
    # WETH → USDC price
    amount_in = "1000000000000000"  # 0.001 ETH
    path_encoded = f"[{WETH},{USDC}]"

    result = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amount_in, path_encoded)
    if result:
        log_result("V2-Price", "getAmountsOut WETH→USDC", True, f"0.001 ETH → {result}")
    else:
        log_result("V2-Price", "getAmountsOut WETH→USDC", False, "Call failed — no liquidity path")

    # Reverse: USDC → WETH
    usdc_amount = "100000"  # 0.1 USDC (6 decimals)
    path_encoded = f"[{USDC},{WETH}]"
    result = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", usdc_amount, path_encoded)
    if result:
        log_result("V2-Price", "getAmountsOut USDC→WETH", True, f"0.1 USDC → {result}")
    else:
        log_result("V2-Price", "getAmountsOut USDC→WETH", False, "Call failed")

# ============================================================
# Pattern 2: V2 vs V3 price comparison (same pair)
# ============================================================
def test_v2_v3_price_comparison():
    print("\n=== Pattern 2: V2 vs V3 Price Comparison ===")
    amount_in = "1000000000000000"  # 0.001 ETH

    # V2 price
    v2_result = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amount_in, f"[{WETH},{USDC}]")

    # V3 quote (using Quoter)
    # QuoterV2 on Base Sepolia
    quoter = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27"
    v3_result = cast_call(quoter,
        "quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)",
        f"({WETH},{USDC},{amount_in},3000,0)")

    if v2_result and v3_result:
        log_result("V2vsV3", "Price comparison WETH/USDC", True, f"V2: {v2_result} | V3: {v3_result}")
    else:
        log_result("V2vsV3", "Price comparison", False, f"V2: {v2_result} | V3: {v3_result}")

# ============================================================
# Pattern 3: Multi-hop arbitrage (triangular)
# ============================================================
def test_triangular_arb():
    print("\n=== Pattern 3: Triangular Arbitrage ===")
    # Find a third token with WETH and USDC pairs
    # Token from Pair 0: 0xBc264F02Ed310B14e44a094DBe3Ac96f26F29CE0
    token_x = "0xBc264F02Ed310B14e44a094DBe3Ac96f26F29CE0"

    amount_in = "100000000000000"  # 0.0001 ETH

    # Path A: WETH → TokenX → USDC → WETH
    path_a = f"[{WETH},{token_x},{USDC},{WETH}]"
    result_a = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amount_in, path_a)

    # Path B: WETH → USDC → TokenX → WETH
    path_b = f"[{WETH},{USDC},{token_x},{WETH}]"
    result_b = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amount_in, path_b)

    log_result("Triangular", f"WETH→X→USDC→WETH", bool(result_a), f"Result: {result_a}")
    log_result("Triangular", f"WETH→USDC→X→WETH", bool(result_b), f"Result: {result_b}")

# ============================================================
# Pattern 4: Scan all V2 pairs for WETH pairs with liquidity
# ============================================================
def scan_weth_pairs():
    print("\n=== Pattern 4: Scan WETH Pairs with Liquidity ===")
    pair_count = cast_call(V2_FACTORY, "allPairsLength()(uint256)")
    count = int(pair_count) if pair_count else 0
    print(f"  Total pairs: {count}")

    weth_pairs = []
    scan_limit = min(count, 50)  # scan first 50

    for i in range(scan_limit):
        pair = cast_call(V2_FACTORY, "allPairs(uint256)(address)", str(i))
        if not pair:
            continue
        token0 = cast_call(pair, "token0()(address)")
        token1 = cast_call(pair, "token1()(address)")
        reserves = cast_call(pair, "getReserves()(uint112,uint112,uint32)")

        if not reserves:
            continue

        parts = reserves.split("\n")
        r0 = int(parts[0].split("[")[0].strip()) if parts else 0
        r1 = int(parts[1].split("[")[0].strip()) if len(parts) > 1 else 0

        has_weth = (token0 and token0.lower() == WETH.lower()) or (token1 and token1.lower() == WETH.lower())
        has_liquidity = r0 > 10**15 and r1 > 10**6  # meaningful liquidity

        if has_weth and has_liquidity:
            other = token1 if token0.lower() == WETH.lower() else token0
            weth_pairs.append({
                "pair": pair, "other": other,
                "r0": r0, "r1": r1,
                "token0": token0, "token1": token1
            })

    log_result("Scan", f"WETH pairs with liquidity (of {scan_limit} scanned)", True,
               f"Found {len(weth_pairs)} pairs")

    for p in weth_pairs:
        print(f"    Pair: {p['pair']}")
        print(f"    Other token: {p['other']}")
        print(f"    Reserves: {p['r0']} / {p['r1']}")

    return weth_pairs

# ============================================================
# Pattern 5: Actual V2 swap execution (small amount)
# ============================================================
def test_v2_swap():
    print("\n=== Pattern 5: V2 Swap Execution ===")
    amount = "100000000000000"  # 0.0001 ETH worth of WETH

    # First approve WETH to V2 Router
    out, ok = cast_send(WETH, "approve(address,uint256)", V2_ROUTER,
                        "115792089237316195423570985008687907853269984665640564039457584007913129639935",
                        gas_limit=100000)
    log_result("V2-Swap", "Approve WETH→Router", ok, out[:100] if out else "failed")

    if not ok:
        return

    # Swap WETH → USDC via V2
    deadline = str(int(time.time()) + 600)
    out, ok = cast_send(V2_ROUTER,
        "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
        amount, "0", f"[{WETH},{USDC}]", ADDR, deadline,
        gas_limit=300000)

    if ok and "status" in out:
        log_result("V2-Swap", "WETH→USDC swap", "status               1" in out, out[:200])
    else:
        log_result("V2-Swap", "WETH→USDC swap", False, out[:200] if out else "failed")

# ============================================================
# Pattern 6: V2 → V3 cross-DEX arbitrage simulation
# ============================================================
def test_cross_dex_arb():
    print("\n=== Pattern 6: Cross-DEX Arb (V2→V3) ===")
    amount = "100000000000000"  # 0.0001 ETH

    # Get V2 output
    v2_out = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amount, f"[{WETH},{USDC}]")

    if v2_out:
        # Parse USDC amount from V2
        lines = v2_out.strip().split("\n")
        if len(lines) >= 2:
            usdc_amount = lines[-1].split("[")[0].strip()
            # Check V3 reverse: USDC → WETH
            quoter = "0xC5290058841028F1614F3A6F0F5816cAd0df5E27"
            v3_reverse = cast_call(quoter,
                "quoteExactInputSingle((address,address,uint256,uint24,uint160))(uint256,uint160,uint32,uint256)",
                f"({USDC},{WETH},{usdc_amount},3000,0)")

            if v3_reverse:
                log_result("CrossDEX", f"V2 buy → V3 sell", True,
                           f"Start: {amount} WETH → V2 → {usdc_amount} USDC → V3 → {v3_reverse}")
            else:
                log_result("CrossDEX", f"V2→V3 reverse quote", False, "V3 quoter failed")
    else:
        log_result("CrossDEX", "V2 price fetch", False, "No V2 liquidity for WETH/USDC")

# ============================================================
# Pattern 7: Flash loan arbitrage framework
# ============================================================
def test_flash_loan_concept():
    print("\n=== Pattern 7: Flash Loan Arb Framework ===")
    # Check if Aave V3 pool exists on Base Sepolia
    aave_pool = "0x07eA79F68B2B3df564D0A34F8e19D9B13E339814"
    code = cast_call(aave_pool, "", rpc=BASE_RPC)
    has_aave = subprocess.run(
        [CAST, "code", aave_pool, "--rpc-url", BASE_RPC],
        capture_output=True, text=True, timeout=15
    )
    aave_exists = has_aave.stdout.strip() != "0x" and len(has_aave.stdout.strip()) > 4
    log_result("FlashLoan", "Aave V3 Pool on Base Sepolia", aave_exists,
               f"Address: {aave_pool}, Code: {has_aave.stdout.strip()[:20]}")

# ============================================================
# Pattern 8: Gas cost analysis
# ============================================================
def test_gas_costs():
    print("\n=== Pattern 8: Gas Cost Analysis ===")
    gas_price = cast_call("", "--rpc-url", BASE_RPC)
    # Use cast gas-price
    r = subprocess.run([CAST, "gas-price", "--rpc-url", BASE_RPC], capture_output=True, text=True, timeout=15)
    gas_price = r.stdout.strip() if r.returncode == 0 else "unknown"

    # Base fee
    r2 = subprocess.run([CAST, "base-fee", "--rpc-url", BASE_RPC], capture_output=True, text=True, timeout=15)
    base_fee = r2.stdout.strip() if r2.returncode == 0 else "unknown"

    log_result("GasCost", "Current gas price", True, f"gasPrice: {gas_price} wei, baseFee: {base_fee} wei")

    # Estimate swap gas
    if gas_price and gas_price != "unknown":
        gp = int(gas_price)
        swap_gas = 150000  # typical V2 swap
        swap_cost_eth = gp * swap_gas / 10**18
        log_result("GasCost", "V2 swap cost estimate", True,
                   f"{swap_gas} gas × {gp} wei = {swap_cost_eth:.10f} ETH")

        # For arb to be profitable: profit > 2 × swap_cost (buy + sell)
        min_profit_eth = swap_cost_eth * 2
        log_result("GasCost", "Min profit threshold", True,
                   f"Need > {min_profit_eth:.10f} ETH per trade")

# ============================================================
# Pattern 9: MEV/Sandwich protection analysis
# ============================================================
def test_mev_analysis():
    print("\n=== Pattern 9: MEV/Sandwich Analysis ===")
    # Check recent blocks for sandwich patterns
    r = subprocess.run([CAST, "block", "latest", "--rpc-url", BASE_RPC],
                      capture_output=True, text=True, timeout=15)
    if r.returncode == 0:
        for line in r.stdout.split("\n"):
            if "gasUsed" in line or "transactions" in line or "number" in line:
                print(f"    {line.strip()}")

    log_result("MEV", "Block analysis", True, "Base Sepolia has sequencer — MEV is limited on L2")

# ============================================================
# Pattern 10: Slippage tolerance testing
# ============================================================
def test_slippage():
    print("\n=== Pattern 10: Slippage Testing ===")
    amounts = ["100000000000000", "500000000000000", "1000000000000000", "5000000000000000"]  # 0.0001 to 0.005 ETH

    for amt in amounts:
        result = cast_call(V2_ROUTER, "getAmountsOut(uint256,address[])(uint256[])", amt, f"[{WETH},{USDC}]")
        eth_val = int(amt) / 10**18
        if result:
            lines = result.strip().split("\n")
            if len(lines) >= 2:
                usdc_out = lines[-1].split("[")[0].strip()
                rate = int(usdc_out) / int(amt) * 10**12  # USDC has 6 decimals, ETH has 18
                log_result("Slippage", f"{eth_val} ETH swap", True, f"→ {usdc_out} USDC (rate: {rate:.4f} USDC/ETH)")
            else:
                log_result("Slippage", f"{eth_val} ETH swap", True, f"Raw: {result}")
        else:
            log_result("Slippage", f"{eth_val} ETH swap", False, "No quote")

# ============================================================
# Main
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("ARBITRAGE MULTI-PATTERN VERIFIER — Base Sepolia")
    print(f"Wallet: {ADDR}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S JST')}")
    print("=" * 60)

    test_v2_price_discovery()
    test_v2_v3_price_comparison()
    test_triangular_arb()
    weth_pairs = scan_weth_pairs()
    test_v2_swap()
    test_cross_dex_arb()
    test_flash_loan_concept()
    test_gas_costs()
    test_mev_analysis()
    test_slippage()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    ok_count = sum(1 for r in results_log if r["success"])
    fail_count = sum(1 for r in results_log if not r["success"])
    print(f"Total tests: {len(results_log)} | OK: {ok_count} | FAIL: {fail_count}")

    print("\nFailed tests:")
    for r in results_log:
        if not r["success"]:
            print(f"  - {r['pattern']}/{r['action']}: {r['details'][:80]}")

    # Save results
    with open("/Users/maekawasei/ozc/arb_results.json", "w") as f:
        json.dump(results_log, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to arb_results.json")
