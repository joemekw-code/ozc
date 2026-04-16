#!/bin/bash
set -e
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "=== OZC Chain ローカルデプロイ (Token + Market + テスト save) ==="
forge script script/DeployLocal.s.sol --rpc-url http://localhost:8545 --broadcast
echo ""
echo "=== 完了 ==="
