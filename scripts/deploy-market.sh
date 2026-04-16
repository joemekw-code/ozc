#!/bin/bash
export PATH="$HOME/.foundry/bin:$PATH"
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
OZC_TOKEN=$1
if [ -z "$OZC_TOKEN" ]; then echo "Usage: bash scripts/deploy-market.sh <OZC_TOKEN_ADDRESS>"; exit 1; fi

echo "=== OzMarket ==="
forge create src/OzMarket.sol:OzMarket --constructor-args "$OZC_TOKEN" --private-key "$KEY"

echo ""
echo "=== approve + test save ==="
cast send "$OZC_TOKEN" "approve(address,uint256)" 0x0000000000000000000000000000000000000000 999999999000000000000000000 --private-key "$KEY"
echo "Done. OzMarket の Deployed to: アドレスで save を試してください。"
