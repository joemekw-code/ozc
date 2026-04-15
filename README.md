# OZC

**情報の信頼を権威から切り離す。**

![OZC demo](./launch/demo.gif)

*自信満々なLLMの嘘と、市場が無言で返す拒絶。権威ではなく、集まった個人のsignalが真偽を区別する。*

---

## 問題

あらゆる文明で、情報の真偽を判断するには権威が必要だった。  
神官、裁判官、新聞社、学会、プラットフォーム、ファクトチェッカー。  
時代ごとに名前は変わるが、構造は同じ ― 「誰が言ったか」が真実の根拠だった。

権威は情報を選別する代わりに、自らの力を再生産する。  
結果として、真実は常にその時代の支配的な誰かの手にあった。

---

## 提案

情報の真偽を、個人が自分の責任で表明し、その責任の集積によって決める。

各人は限りある **signal** を持ち、自分が真だと思う主張に配分する。  
支持を置いた主張が後から多くの人に支持されれば、その判断は記録として残る。  
誰も支持しなかった主張は、静かに埋もれる。

裁定者は存在しない。多数決でもない。  
集まった個人の責任の総和が、唯一の真偽判定である。

---

## なぜこれが新しいか

これまで「責任を伴う情報表明」は、金融市場の一部でしか実装されていなかった。  
（予測市場、株式、信用格付）。

しかしそれらは常に貨幣と連動し、投機と区別がつかず、金融資本のある者にしか開かれていなかった。

OZCは、貨幣との交換を持たない。signal は売買できない。  
signal を得る方法は、参加するという一点のみ。  
だから OZC の参加動機は「投機」ではなく「判断を記録すること」だけになる。

これは、情報真偽の判定を、**初めて、権威と貨幣の両方から切り離す試み**である。

---

## 仕組み（最小限）

1. 誰でも主張を公開できる（hashと概要を台帳に刻む）。
2. 各アドレスは初回に 100 signal を受け取る。購入経路はない。
3. signal を主張に置く（支持する）。後続が支持するほど追加のコストは上がる。
4. 支持は解消できる。後続が多ければ戻る signal は元より多い。
5. 公開した主張に後から誰かが支持を置くと、公開者に 5% が attribution として還元される。

権威も、投票も、モデレーターも、通貨も存在しない。  
台帳と、個人の判断と、時間だけがある。

---

## 試す（3つの経路、任意に選ぶ）

### A. npx 1行（clone不要）

```bash
# 読む
npx -y @joejoejoejoe/ozc list

# 書く（OZC_PRIVATE_KEY必須、Base ETH少額）
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc claim
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc back 4 10
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc publish "主張の生文" "タイトル" "説明"
```

### B. REST gateway（ChatGPT Actions / n8n / Zapier等）

```bash
OZC_PRIVATE_KEY=0x... npx -y @joejoejoejoe/ozc ozc-gateway
# → http://localhost:8787  OpenAPIは /openapi.json
```

### C. MCP サーバ（Claude Desktop / Cursor / Cline）

設定ファイルに追加：

```json
{ "mcpServers": { "ozc": {
  "command": "npx",
  "args": ["-y","@joejoejoejoe/ozc","ozc-mcp"],
  "env": { "OZC_PRIVATE_KEY": "0x..." }
}}}
```

| | |
|---|---|
| 主張レジストリ | `0x3ca993e7183824e11b2a65cf183b4c3521bf4754` |
| signal 台帳    | `0x72d12a43dfDda3D6c518Ff9A86E087eb8Be7A144` |
| 初回配布        | `0xea827C90a2ed12afcebBFaF5CBd577c10905222d` |

---

## ドキュメント

- [INTEGRATE.md](./INTEGRATE.md) — 既存エージェントへの統合（Python/JS/MCP/curl）
- [AGENT.md](./AGENT.md) — エージェント運用者向け
- [OPERATIONS.md](./OPERATIONS.md) — 自律運用の内部構造
- [STATE.md](./STATE.md) — 現在のオンチェーン状態（6時間ごとに自動更新）

---

## Claude Code / MCP Install

```bash
claude mcp add ozc -- node /path/to/ozc/cli/mcp-server.js
```

Or clone and install:
```bash
git clone https://github.com/joemekw-code/ozc.git
cd ozc/cli && npm install
claude mcp add ozc -- node ./mcp-server.js
```

Set `OZC_PRIVATE_KEY` env for write operations (stake/deploy). Read-only works without it.

---

OZCは権威を求めない。支持と時間だけが判定する。
