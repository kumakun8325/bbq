# 変更履歴 (CHANGELOG)

このプロジェクトの重要な変更を記録します。

フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) に基づいています。

---

## [Unreleased]

### 追加 (Added)
- 初期プロジェクトセットアップ (Phaser 3 + TypeScript + Webpack)
- 基本シーン遷移 (Boot → Preload → Title → Map → Battle)
- タイトル画面（アニメーション付き）
- マップ画面（プレイヤー移動、エンカウント）
- バトル画面（たたかう/ぼうぎょ/にげる）
- 3種類の敵（スライム、コウモリ、ゴブリン）
- SDD ドキュメント構成
  - `.kiro/steering/requirements.md`
  - `.kiro/steering/design.md`
  - `.kiro/steering/tasks.md`
  - `docs/SPECIFICATION.md`
  - `docs/DEVELOPMENT_WORKFLOW.md`

### 変更 (Changed)
- 

### 修正 (Fixed)
- 

---

## [0.1.0] - 2025-12-13

### 追加 (Added)
- プロジェクト初期化
- MVP版シーン遷移

---

## テンプレート

新しいリリースを記録する際のテンプレート:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### 追加 (Added)
- 新機能

### 変更 (Changed)
- 既存機能の変更

### 非推奨 (Deprecated)
- 将来削除予定の機能

### 削除 (Removed)
- 削除された機能

### 修正 (Fixed)
- バグ修正

### セキュリティ (Security)
- セキュリティ修正
```
