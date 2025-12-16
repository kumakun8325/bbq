# 🗓️ BBQ セッションログ

> プロジェクトの作業履歴を記録する

---

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
