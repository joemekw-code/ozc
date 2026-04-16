#!/bin/bash
set -e
export PATH="$HOME/.foundry/bin:$PATH"
ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

echo "=== OZC Token デプロイ ==="
forge create src/OZCToken.sol:OZCToken --constructor-args 100000000000000000000000000 "$ADDR" --from "$ADDR" --unlocked

echo ""
echo "=== 上の Deployed to: のアドレスをコピーして以下を実行 ==="
echo "bash scripts/deploy-market.sh <OZC_TOKEN_ADDRESS>"
