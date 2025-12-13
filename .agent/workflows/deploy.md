---
description: Firebase Hostingへのデプロイ手順
---

# デプロイワークフロー

## 本番デプロイ

```bash
# 1. mainブランチに切り替え
git checkout main

# 2. ビルド
// turbo
npm run build

# 3. Firebase デプロイ
firebase deploy --only hosting
```

---

## プレビューデプロイ

開発中の機能をテストする場合:

```bash
# 1. ビルド
// turbo
npm run build

# 2. プレビューチャンネルにデプロイ（7日間有効）
firebase hosting:channel:deploy preview --expires 7d
```

---

## 注意事項

- 本番デプロイ前に必ずビルドが成功することを確認
- 型チェック (`npm run type-check`) も実行推奨
- 環境変数の設定が必要な場合は `.env` を確認
