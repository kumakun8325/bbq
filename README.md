# BBQ - Bird Battle Quest

FF6 × オクトパストラベラー風の2D RPGです。

## 🎮 技術スタック

- **言語**: TypeScript
- **ゲームエンジン**: Phaser 3
- **ビルド**: Webpack 5
- **デプロイ**: Firebase Hosting (PWA)

## 🚀 開発を始める

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 型チェック
npm run type-check
```

## 📁 プロジェクト構造

```
bbq/
├── src/
│   ├── main.ts              # エントリーポイント
│   ├── config/              # ゲーム設定
│   ├── scenes/              # Phaserシーン
│   ├── entities/            # ゲームエンティティ
│   ├── systems/             # ゲームシステム
│   ├── ui/                  # UI コンポーネント
│   ├── data/                # ゲームデータ (JSON)
│   ├── types/               # TypeScript型定義
│   └── utils/               # ユーティリティ
├── assets/                  # ゲームアセット
├── public/                  # 静的ファイル
└── .kiro/steering/          # SDD ドキュメント
    ├── requirements.md      # 要件定義
    ├── design.md            # 設計書
    └── tasks.md             # タスク管理
```

## 🎯 MVP 機能 (v0.1)

- [x] プロジェクト初期化
- [x] 基本シーン遷移 (Title → Map → Battle)
- [x] Tiledマップシステム（衝突判定付き）
- [x] ランダムエンカウント（草むらで発生）
- [x] ターン制バトル (たたかう / ぼうぎょ / にげる)
- [x] 3種類の敵 (スライム / コウモリ / ゴブリン)

## 🕹️ 操作方法

### マップ画面
- **WASD / 矢印キー**: 移動
- **ESC**: タイトルに戻る
- **B**: バトル画面へ（デバッグ用）

### バトル画面
- **上下 / W・S**: コマンド選択
- **SPACE / ENTER / Z**: 決定

## 📝 ドキュメント

- [要件定義](.kiro/steering/requirements.md)
- [設計書](.kiro/steering/design.md)
- [タスク管理](.kiro/steering/tasks.md)

## 📜 ライセンス

MIT License
