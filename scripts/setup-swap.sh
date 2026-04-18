#!/bin/bash
set -e
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "=== OZC Chain: Token + Market + Swap デプロイ ==="
forge script script/DeploySwap.s.sol --rpc-url http://localhost:8545 --broadcast
echo ""
echo "=== Swap pool 稼働中 (1,000,000 OZC + 1 ETH) ==="
