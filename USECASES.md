# OZCのユースケース

OZCは土台です。以下はその上で実装できる具体的な応用。

---

## 1. エージェント出力の事実確認レイヤー

LLMが「〇〇は事実です」と主張する前に、OZCに同じ主張が既にあるか・どれだけ支持されているかを問う。

```bash
ozc verify "Bitcoin was mined on January 3, 2009"
# → EXACT MATCH: claim already on OZC as #1
#   signal backing: 0.029...  supply: 31
```

**これで何が変わるか**：エージェントが「自信満々に間違ったこと」を言う頻度が、経済的に裏付けられた市場評価で抑制される。  
ユーザー側：LLMの出力を盲目的に信じずに済む。

### 統合例（Python）

```python
import subprocess, json
def check(claim):
    r = subprocess.run(["npx","-y","github:joemekw-code/ozc","verify",claim],
                       capture_output=True, text=True)
    return "EXACT MATCH" in r.stdout

if check(my_llm_output):
    print("OZC上で既に検証済み")
```

---

## 2. 集合判断をAPIで取得するオラクル

ChatGPT Actions / n8n / Zapier / 任意のwebhook系から、HTTP GETで取得できる。

```bash
# 起動（自分のマシンで）
npx -y github:joemekw-code/ozc ozc-gateway

# 問い合わせ
curl 'http://localhost:8787/oracle?claim=Bitcoin+was+mined+January+3+2009'
```

レスポンス：
```json
{
  "exactMatch": { "id": 1, "signal": "0.029...", "supply": "31" },
  "similar": [...]
}
```

**応用**：
- ニュースサイトの主張ランキング
- コミュニティモデレーションの判断補助
- エージェント間の合意形成

---

## 3. 自律エージェントの署名台帳

エージェントが「自分はこれを信じる」と表明するたびに OZC に publish。時間とともに各エージェントの判断履歴と的中率が on-chain に残る。

```bash
OZC_PRIVATE_KEY=0x... ozc publish \
  "Ethereum L2 TVL will exceed L1 TVL by end of 2027" \
  "L2>L1 2027" \
  "Prediction based on gas cost trends"
```

**効果**：エージェントに「責任のある発言」を促す経済的構造。  
将来、各wallet addressを検索すれば「このエージェントは何を信じて、何が当たっていたか」が分かる。

---

## 4. 人間とエージェントの混在市場

- 人間: 哲学的・価値観的主張、直感で支持
- エージェント: 計算可能な予測、統計的に支持

両者が同じレジストリに共存し、差別化された判断を残す。  
「エージェントは哲学では主張しない」「人間は予測では控えめ」といった**分布の発見**自体が価値になる。

---

## 5. コンテンツ付帯の信頼スコア

ブログ・記事・ドキュメント末尾に「この記事の主要主張は OZC #N に backing 0.2 signal」と表示。  
読者はオーサリング時点の著者のコミットと、その後の市場評価を両方見られる。

実装例：`<a href="https://basescan.org/address/0x3ca99...#readContract">backed on OZC</a>` の静的リンク埋め込みだけで可能。

---

## この5つが浸透すると何が起きるか

OZCは「単なるオープンソース」から「**情報の相互評価インフラ**」に昇格する。  
使えば使うほど、判断履歴と市場評価が蓄積し、先行者（早期Creator/Backer）が経済的に報われる設計。  
これが自律的な拡大エンジンになる。
