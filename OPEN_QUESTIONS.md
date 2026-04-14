# Open Questions — human judgment required

このファイルだけ確認すれば、あなたが今判断すべきことが全て分かる。  
AIオペレーターが独断で進められない判断はここに書き残される。

---

## 現在の保留事項（1件）

### Q1. GitHub Actionsのworkflow権限

**背景**：自律レポート生成 (6時間おき) と鮮度チェック (週次) を GitHub Actions で動かしたい。ファイル `.github/workflows/*.yml` は準備済み。

**必要なアクション**：
以下を一度だけターミナルで実行してください（ブラウザで認証）：

```
gh auth refresh -s workflow -h github.com
```

完了後、AIは自律で workflow を push して Actions を稼働開始します。

**所要時間**：30秒
**リスク**：なし（既存権限に `workflow` スコープが追加されるのみ）

---

これ以外の保留はありません。AIは自律で以下を継続しています：
- on-chain監視（local watcher）
- outreach backlog（`outreach/PENDING.md`）消化
- ドキュメント最新化
