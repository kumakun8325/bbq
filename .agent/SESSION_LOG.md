# 🗓️ BBQ セッションログ

> プロジェクトの作業履歴を記録する

---

## 2025-12-18（木）

### 実施内容
- **BPシステム実装（TASK-025完了）** ※別ブランチ `feature/bp-system` にて完了
  - `BattleScene.ts`: BPデータ、UI、ブーストロジック実装
  - `battleConfig.ts`: 定数追加
- **PWA/スマホ対応の不具合修正（作業中）**
  - タッチ操作、UIサイズ修正、ATBバー修正を試行（デプロイ確認したが未解決）
  - デプロイURL: `https://bbq-game-a502a--preview-oll41vag.web.app`

### 変更ファイル
- `src/scenes/BattleScene.ts` - UI修正、タッチ修正
- `docs/SPECIFICATION.md` - アートスタイル追記

### 次回TODO
- [ ] **バグ修正（PWA/Mobile）**:
  - タッチ操作が反応しない問題の調査・修正
  - UIサイズ（SHIELD, [?]）が大きすぎる問題の修正
  - ATBバーが途中で止まる、一部キャラ（index 0, 1）が表示されない問題の修正
- [ ] **キャラ頭身変更**:
  - オクトラ風（2.5〜3頭身）へのドット絵変更（参考: https://dotartplay.com/octopathtraveler-dot）
- [ ] **TASK-026**: マルチヒット攻撃実装
- [ ] **TASK-020**: 武器合成システム

### ブランチ状態
- 現在: `feature/pwa-mobile-support` (修正中)
- 完了: `feature/bp-system` (マージ待ち)

## 2025-12-16（月）

### 実施内容
- **PWA対応**
  - `manifest.json` 作成（アプリ名、アイコン、テーマカラー等）
  - Service Worker自動生成設定（Workbox）
  - iOS/Android向けメタタグ追加
  - `viewport-fit=cover` 対応
  
- **スマホタッチ操作の実装**
  - マップ画面: タップした場所まで自動歩行
  - バトル画面: コマンドを直接タップで選択
  - バトル画面: 敵をタップでターゲット決定
  - VirtualGamepad（仮想パッド）は削除（タッチ操作に変更）

- **UI改善**
  - タイトル画面の文字サイズを拡大（12px → 24px）
  - CSS調整（全画面表示、タッチ操作の最適化）

### 変更ファイル
- `src/index.html` - PWAメタタグ、CSS調整
- `src/main.ts` - Service Worker登録
- `src/scenes/MapScene.ts` - タップ移動実装
- `src/scenes/BattleScene.ts` - タッチ操作対応
- `src/scenes/TitleScene.ts` - 文字サイズ拡大
- `public/manifest.json` - 新規作成
- `public/pwa-icon.png` - 新規追加
- `webpack.config.js` - Workbox設定追加

### 次回TODO
- [ ] **TASK-025**: BPシステム実装（ブーストポイント）
  - BPゲージUI表示
  - 毎ターンBP回復ロジック
  - コマンド選択時のBP消費

### ブランチ状態
- ブランチ名: `feature/pwa-mobile-support`
- 状態: **作業完了、マージ待ち**
- コミット: `8b6d152`

---

## 2025-12-15（日）

### 実施内容
- セーブ/ロード機能の基盤実装（SaveManager, SaveLoadScene）
- オートセーブ機能追加
- design.md / tasks.md 更新

### ブランチ状態
- ブランチ名: `feature/save-load-system`
- 状態: 作業中（PWA対応に派生）

---

*次回 `/resume` 時はこのファイルを参照して作業を再開する*
