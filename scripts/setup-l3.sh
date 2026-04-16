#!/bin/bash
set -e

echo "=== OZC L3 Chain Setup ==="
echo "Codespace 上で OZC 専用チェーンを起動します"
echo ""

# 1. Foundry install
if ! command -v forge &>/dev/null; then
  echo "[1/5] Foundry インストール中..."
  curl -L https://foundry.paradigm.xyz | bash
  source ~/.bashrc 2>/dev/null || true
  export PATH="$HOME/.foundry/bin:$PATH"
  foundryup
else
  echo "[1/5] Foundry 確認済み"
  export PATH="$HOME/.foundry/bin:$PATH"
fi

# 2. npm install
echo "[2/5] npm install..."
cd /workspaces/ozc/cli
npm install --silent 2>/dev/null
cd /workspaces/ozc

# 3. Start Anvil as OZC chain (chain-id 420420, block time 2s, gas price 0)
echo "[3/5] OZC Chain 起動 (chain-id: 420420)..."
anvil \
  --chain-id 420420 \
  --port 9545 \
  --block-time 2 \
  --gas-price 0 \
  --base-fee 0 \
  --host 0.0.0.0 \
  --silent &
ANVIL_PID=$!
sleep 3

if ! kill -0 $ANVIL_PID 2>/dev/null; then
  echo "ERROR: Anvil 起動失敗"
  exit 1
fi
echo "  Anvil PID: $ANVIL_PID"
echo "  RPC: http://localhost:9545"

# Default anvil account
DEPLOYER_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEPLOYER_ADDR=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
RPC=http://localhost:9545

# 4. Deploy OZC Token + OzMarket
echo "[4/5] OZC Token + OzMarket デプロイ中..."

OZC_ADDR=$(forge create src/OZCToken.sol:OZCToken \
  --constructor-args 100000000000000000000000000 $DEPLOYER_ADDR \
  --private-key $DEPLOYER_KEY --rpc-url $RPC 2>&1 | grep "Deployed to:" | awk '{print $3}')
echo "  OZC Token: $OZC_ADDR"

if [ -z "$OZC_ADDR" ]; then echo "ERROR: OZC Token deploy failed"; kill $ANVIL_PID 2>/dev/null; exit 1; fi

MKT_ADDR=$(forge create src/OzMarket.sol:OzMarket \
  --constructor-args $OZC_ADDR \
  --private-key $DEPLOYER_KEY --rpc-url $RPC 2>&1 | grep "Deployed to:" | awk '{print $3}')
echo "  OzMarket:  $MKT_ADDR"

if [ -z "$MKT_ADDR" ]; then echo "ERROR: OzMarket deploy failed"; kill $ANVIL_PID 2>/dev/null; exit 1; fi

# Approve
cast send $OZC_ADDR "approve(address,uint256)" $MKT_ADDR 999999999000000000000000000 \
  --private-key $DEPLOYER_KEY --rpc-url $RPC > /dev/null 2>&1

# 5. Test save
echo "[5/5] テスト save 実行中..."
cast send $MKT_ADDR 'save(string,string,uint256)' \
  "https://github.com/joemekw-code/ozc" \
  "OZC: decentralized index with personal filters" \
  1 \
  --private-key $DEPLOYER_KEY --rpc-url $RPC > /dev/null 2>&1

KEY=$(cast call $MKT_ADDR "keyOf(string)(bytes32)" "https://github.com/joemekw-code/ozc" --rpc-url $RPC)
PRICE=$(cast call $MKT_ADDR "price(bytes32)(uint256)" $KEY --rpc-url $RPC)

echo ""
echo "========================================="
echo "  OZC Chain 起動完了"
echo "========================================="
echo ""
echo "  Chain ID:    420420"
echo "  RPC:         http://localhost:9545"
echo "  Gas Price:   0 (無料)"
echo "  OZC Token:   $OZC_ADDR"
echo "  OzMarket:    $MKT_ADDR"
echo "  テスト save:  成功"
echo "  Next price:  $PRICE"
echo ""
echo "  使い方:"
echo "    OZC_PRIVATE_KEY=$DEPLOYER_KEY OZC_RPC=$RPC node cli/save2.js \"https://任意のURL\" \"メモ\""
echo ""
echo "  停止: kill $ANVIL_PID"
echo ""

# Save addresses for other tools
cat > /workspaces/ozc/.env.l3 << EOF
OZC_CHAIN_ID=420420
OZC_RPC=http://localhost:9545
OZC_TOKEN=$OZC_ADDR
OZC_MARKET=$MKT_ADDR
OZC_PRIVATE_KEY=$DEPLOYER_KEY
ANVIL_PID=$ANVIL_PID
EOF

echo "環境変数: source .env.l3"
