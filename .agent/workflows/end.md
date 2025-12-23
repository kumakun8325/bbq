---
description: 作業終了時の進捗記録と次回再開用の情報更新
---

# BBQ プロジェクト作業終了

作業終了時に以下の手順で進捗を記録し、次回の `/resume` で作業を再開できるようにする。

---

## 1. Git状態の確認

```bash
git status
git branch
git log -3 --oneline
```

未コミットの変更がある場合は、適切なメッセージでコミットする。

---

## 2. 作業実績の更新

### 2.1 `SESSION_LOG.md` を更新

`.agent/SESSION_LOG.md` に以下の形式で今日の作業を記録する:

```markdown
## YYYY-MM-DD（曜日）

### 実施内容
- 実装した機能や修正内容を箇条書きで記載

### 変更ファイル
- 主要な変更ファイルを列挙

### 次回TODO
- 次回作業で取り組むべき内容

### ブランチ状態
- 現在のブランチ名
- マージ待ちの場合は明記
```

### 2.2 `tasks.md` を更新

`.kiro/steering/tasks.md` の以下を更新:
- **Last Updated** の日付を更新
- 完了したタスクを「完了タスク」セクションに移動
- 進行中タスクの進捗を追記
- 新規タスクがあればバックログに追加

---

## 3. ブランチの整理

### 完成したフィーチャーブランチの場合
// turbo
```bash
git checkout main
git merge feature/xxx --no-ff
git push origin main
git branch -d feature/xxx
```

### 作業途中のブランチの場合
// turbo
```bash
git push origin feature/xxx
```

---

## 4. resume.md への反映

`.agent/workflows/resume.md` の **フィーチャーブランチ対応表** に新しいブランチがあれば追加する。

---

## 5. 最終確認

1. [ ] 未コミットの変更がないか確認
2. [ ] リモートにプッシュされているか確認
3. [ ] SESSION_LOG.md が更新されているか確認
4. [ ] tasks.md の日付が更新されているか確認

---

## 📄 SESSION_LOG.md テンプレート

初回作成時は以下の内容で `.agent/SESSION_LOG.md` を作成する:

```markdown
# 🗓️ BBQ セッションログ

> プロジェクトの作業履歴を記録する

---

## YYYY-MM-DD

### 実施内容
- ...

### 変更ファイル
- ...

### 次回TODO
- ...

### ブランチ状態
- ブランチ名: `feature/xxx`
- 状態: 作業中 / マージ待ち / 完了
```

---

*このワークフローは作業終了時に実行し、次回の `/resume` で継続できるようにします。*
