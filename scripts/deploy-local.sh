#!/bin/bash
# OZC Chain ローカルデプロイ。Anvil が 8545 で動いている前提。
export PATH="$HOME/.foundry/bin:$PATH"
KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

echo "=== OZC Token ==="
forge create src/OZCToken.sol:OZCToken --constructor-args 100000000000000000000000000 "$ADDR" --private-key "$KEY"

echo ""
echo "=== 上の Deployed to: のアドレスをコピーして以下を実行 ==="
echo "bash scripts/deploy-market.sh <OZC_TOKEN_ADDRESS>"
