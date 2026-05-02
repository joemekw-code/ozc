# OZC Simulation Report v0.1

## Purpose

このシミュレーションの目的は、OZC の `論点 -> 主張 -> ステーク` 構造が、人を集める前に制度として前進可能かを確認すること。

主に以下を見た。

- 価値ある主張にステークが残りやすいか
- 低品質・扇動的主張が上位を奪い続けないか
- 最低ステーク額と引き出しクールダウンの妥当レンジがあるか

## Model

前提ルール:

- `論点` は誰でも作成可能
- 論点作成時に最初の `主張` と初期ステークが必要
- `論点総流通量 = その論点に属する全主張の total stake 合計`
- 論点順位はカテゴリ内で総流通量順
- 主張順位は論点内で total stake 順
- ステークは消費ではなくロック
- 引き出しは可能

エージェント種類:

- `informed`
- `attention`
- `trend`
- `contrarian`
- `manipulator`

## Scenarios

5パターンを比較した。

| scenario | min_stake | cooldown_steps |
|---|---:|---:|
| open_low_friction | 1.0 | 0 |
| cooldown_light | 1.0 | 8 |
| cooldown_medium | 3.0 | 8 |
| cooldown_strict | 5.0 | 12 |
| high_barrier | 8.0 | 16 |

## Results

| scenario | composite_score | top_claim_quality_mean | high_quality_stake_share | low_quality_stake_share |
|---|---:|---:|---:|---:|
| cooldown_light | 3.6940 | 0.9704 | 0.9589 | 0.0090 |
| open_low_friction | 2.4631 | 0.9406 | 0.2513 | 0.0083 |
| cooldown_medium | 1.9847 | 0.8417 | 0.0953 | 0.0106 |
| high_barrier | 1.9801 | 0.8425 | 0.0955 | 0.0110 |
| cooldown_strict | 1.8641 | 0.7703 | 0.0923 | 0.0087 |

best scenario:

- `cooldown_light`
- `min_stake = 1.0`
- `cooldown_steps = 8`

## What This Means

### 1. 完全自由より、軽いクールダウンありの方が良い

`open_low_friction` でも上位主張品質は悪くないが、`high_quality_stake_share` が `0.2513` にとどまった。

一方 `cooldown_light` は:

- `top_claim_quality_mean = 0.9704`
- `high_quality_stake_share = 0.9589`
- `manipulator_capture_top20_share = 0.0`

で最も良い。

結論:

- `引き出し自由 + 即時反映` より
- `軽いロック期間` を入れた方が
- 良質主張への注目が残りやすい

### 2. 最低ステークを上げすぎると逆に痩せる

`cooldown_medium`, `cooldown_strict`, `high_barrier` は、

- issue 数
- claim 数
- stake placement 数

が大きく減った。

結論:

- 高すぎる最低額はスパム防止には効く
- しかし市場全体の流動性と多様性も削る

### 3. 今の MVP で最も有望なのは「低い最低額 + 軽い引き出し待ち」

このシミュレーション内では、

- `最低ステークは低め`
- `引き出しはできる`
- `ただし少し待つ`

が最も制度として前進しやすい。

## Forward Condition

このシミュレーションから見た `前進条件` は以下。

1. `最低ステーク額` は参入障壁になりすぎないこと
2. `即時引き出し不可` の軽いクールダウンを入れること
3. 論点作成と最初の主張を一体にすること
4. 論点順位を `論点総流通量`、主張順位を `主張 total stake` で統一すること

## Not Yet Proven

この結果は制度シミュレーションとしては有効だが、まだ以下は未証明。

- 現実の人間が同じ行動をするか
- 似た主張放置で UI がどこまで耐えるか
- 煽りや短文扇動が実ユーザー相手でも沈むか
- 少人数実験で同じ傾向が出るか

## Recommended Next Step

次は `本物の少額入金実験` ではなく、以下の順で進めるのが妥当。

1. `触れるプロトタイプ` を作る
2. `cooldown_light` 相当のルールでダミー残高実験をする
3. 少人数クローズドで実ユーザー行動を見る
4. その後に real money を検討する

## Files

- simulation script: [ozc_attention_sim.py](/Users/maekawasei/ozc/analysis/ozc_attention_sim.py)
- raw result: [ozc_attention_sim.json](/Users/maekawasei/ozc/analysis/results/ozc_attention_sim.json)
