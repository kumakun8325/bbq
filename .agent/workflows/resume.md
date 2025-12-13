---
description: プロジェクト再開時の進捗確認と次タスク提案
---

# BBQ プロジェクト再開

## 1. コアドキュメント読み込み

以下のファイルを読み込んでプロジェクトの状態を把握する:

- `.kiro/steering/tasks.md` - タスク管理
- `.kiro/steering/requirements.md` - 要件定義
- `.kiro/steering/design.md` - 設計ドキュメント

## 2. 追加で参照すると良いファイル

| ファイル | 説明 |
|----------|------|
| `docs/SPECIFICATION.md` | 詳細仕様 |
| `docs/DEVELOPMENT_WORKFLOW.md` | 開発・デプロイ手順 |
| `CHANGELOG.md` | 変更履歴 |
| `README.md` | プロジェクト概要 |

## 3. Git状態確認

```bash
git status
git branch -a
```

## 4. フィーチャーブランチ対応表

| ブランチ名 | 機能 |
|-----------|------|
| `feature/player-sprite` | 歩行アニメーション付きプレイヤースプライト |
| `feature/battle-improvements` | バトルUI改善、ダメージポップアップ |
| `feature/shield-break` | オクトパストラベラー風シールド/ブレイクシステム |

## 5. 次のアクション

1. 現在の進捗状況を要約
2. 進行中/未完了のタスクを一覧表示
3. 次に取り組むべきタスクを提案
4. ユーザーが選択したブランチに切り替え
