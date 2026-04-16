#!/bin/bash
set -e
export PATH="$HOME/.foundry/bin:$PATH"
ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
OZC_TOKEN=$1
if [ -z "$OZC_TOKEN" ]; then echo "Usage: bash scripts/deploy-market.sh <OZC_TOKEN_ADDRESS>"; exit 1; fi

echo "=== OzMarket デプロイ ==="
forge create src/OzMarket.sol:OzMarket --constructor-args "$OZC_TOKEN" --from "$ADDR" --unlocked

echo ""
echo "=== OzMarket の Deployed to: アドレスをコピーして approve ==="
echo "cast send $OZC_TOKEN 'approve(address,uint256)' <MARKET_ADDR> 999999999000000000000000000 --from $ADDR --unlocked"
