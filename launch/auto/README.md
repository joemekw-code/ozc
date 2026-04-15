# launch/auto — 自動投稿スクリプト

各外部プラットフォームへの投稿を完全自動化したスクリプト。  
あなたが credentials を1回貼るだけで、僕が残り全部やります。

## 優先度と1回分のあなたの作業時間

| チャネル | スクリプト | 必要な credentials | 作業時間 | 期待効果 |
|---------|---------|------------------|---------|---------|
| **npm** | `npm-publish.sh` | NPM_TOKEN | 2分 | `npm i ozc` で全世界即利用可。発見経路×10 |
| **HN Show HN** | `hn.js` | HN_USER + HN_PASS | 2分 | 1発hitで24h 1-5k閲覧 |
| **X / Twitter** | `x.js` | auth_token + ct0 cookie | 3分 | フォロワー＋インプレッション拡大 |
| **Reddit (LocalLLaMA等)** | `reddit.js` | API app 作成＋user/pass | 5分 | カテゴリ別ターゲット拡散 |
| **Farcaster** | `farcaster.js` | Neynar key + signer / Warpcast cookie / OP privkey | 3-10分 | crypto-native developer層に到達 |

## 実行方法（例）

### npm（最優先・最速）

```bash
NPM_TOKEN=npm_xxxxxxxx bash launch/auto/npm-publish.sh
```

**NPM_TOKEN の取り方**：
1. https://www.npmjs.com にログイン
2. Profile → Access Tokens → Generate New Token
3. Type: **Automation**（CI用、無期限）
4. 作成された `npm_xxx...` の文字列を貼る

### Hacker News Show HN

```bash
HN_USER=あなたのHNユーザー名 \
HN_PASS=あなたのHNパスワード \
node launch/auto/hn.js
```

Chromium が立ち上がり、ログイン → 投稿画面 → 30秒待機 → 自動送信。
送信前に画面確認できます。

### X / Twitter

```bash
X_COOKIE_AUTH_TOKEN=... X_COOKIE_CT0=... node launch/auto/x.js
```

cookieの取り方：
1. x.com にログイン済みのブラウザで DevTools を開く (Cmd+Opt+I)
2. Application → Storage → Cookies → https://x.com
3. `auth_token` と `ct0` の2つの値をコピー

### Reddit

```bash
RD_CLIENT_ID=xxx RD_CLIENT_SECRET=yyy \
RD_USER=あなたのredditユーザー \
RD_PASS=あなたのパスワード \
RD_SUB=LocalLLaMA \
node launch/auto/reddit.js
```

API app の作り方：
1. https://www.reddit.com/prefs/apps
2. "create another app" → **script** type
3. Redirect URI: `http://localhost:8080` （ダミーでOK）
4. client_id と secret が表示される

### Farcaster

3経路サポート。優先度順:

```bash
# A. Neynar (推奨・無料tier): https://neynar.com で sign up → API key & signer
FC_NEYNAR_API_KEY=... FC_NEYNAR_SIGNER_UUID=... node launch/auto/farcaster.js

# B. Warpcast cookie (既存 Warpcast アカウントがある場合)
FC_WARPCAST_COOKIE="<warpcast.com の cookie>" node launch/auto/farcaster.js

# C. Onchain 登録 (wallet-native, OP ETH ~0.0003 必要)
node launch/auto/farcaster.js --register --dry-run   # 確認
FC_PRIVKEY=0x... node launch/auto/farcaster.js --register
```

現状 (2026-04): wallet `0xB8E5...1d0f` は FID 未登録、OP残高 0。
FID 登録費は onchain price 実測 **~0.0000853 ETH (≒$0.30)** で、$5 ではない。
ただし署名用 ETH (OP) を少量 bridge する必要あり。

## 倫理的に絶対しないこと

- 偽アカウントの作成
- なりすまし
- bot で engagement を偽装
- 同一内容を複数sub/account に連投（スパム判定防止）
- 自作自演で自分の投稿に upvote

## 何をどう選ぶか

あなたの identity 起点で、使える順に消化していきます。
**NPM_TOKEN を最初にください**（npm publishが最も低い労力で最も多くの経路を開ける）。
