#!/bin/bash
# npm publish 自動化
# 必要: NPM_TOKEN（https://www.npmjs.com/settings/<user>/tokens で "automation" タイプを作成）

set -e

if [ -z "$NPM_TOKEN" ]; then
  echo "NPM_TOKEN が未設定。npmjs.com にログインして automation token を発行してください。"
  exit 1
fi

cd "$(dirname "$0")/../.."

# npm auth token を設定
cat > ~/.npmrc <<EOF
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
EOF

# パッケージ名の衝突チェック
if npm view ozc 2>/dev/null | grep -q "name: 'ozc'"; then
  echo "パッケージ名 'ozc' は既に存在します。package.jsonの name を変更してください。"
  exit 1
fi

npm publish --access public
echo "npm publish 完了 — https://www.npmjs.com/package/ozc"
