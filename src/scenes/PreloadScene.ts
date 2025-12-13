/**
 * PreloadScene - メインアセットをロードするシーン
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';

export class PreloadScene extends Phaser.Scene {
    private progressBar!: Phaser.GameObjects.Graphics;
    private progressBox!: Phaser.GameObjects.Graphics;
    private loadingText!: Phaser.GameObjects.Text;
    private percentText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload(): void {
        this.createLoadingUI();
        this.setupLoadEvents();
        this.loadAssets();
    }

    /**
     * ローディングUIを作成
     */
    private createLoadingUI(): void {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        // プログレスボックス（外枠）
        this.progressBox = this.add.graphics();
        this.progressBox.fillStyle(0x222222, 0.8);
        this.progressBox.fillRect(centerX - 160, centerY - 15, 320, 30);

        // プログレスバー
        this.progressBar = this.add.graphics();

        // ローディングテキスト
        this.loadingText = this.add.text(centerX, centerY - 40, 'Loading...', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#e94560'
        });
        this.loadingText.setOrigin(0.5);

        // パーセント表示
        this.percentText = this.add.text(centerX, centerY, '0%', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '10px',
            color: '#ffffff'
        });
        this.percentText.setOrigin(0.5);
    }

    /**
     * ロードイベントのセットアップ
     */
    private setupLoadEvents(): void {
        this.load.on('progress', (value: number) => {
            this.percentText.setText(`${Math.floor(value * 100)}%`);

            this.progressBar.clear();
            this.progressBar.fillStyle(0xe94560, 1);
            this.progressBar.fillRect(
                GAME_WIDTH / 2 - 155,
                GAME_HEIGHT / 2 - 10,
                310 * value,
                20
            );
        });

        this.load.on('complete', () => {
            this.progressBar.destroy();
            this.progressBox.destroy();
            this.loadingText.destroy();
            this.percentText.destroy();
        });
    }

    /**
     * アセットをロード
     */
    private loadAssets(): void {
        // ===== タイルセットを動的生成 =====
        this.createTilesetTexture();

        // ===== マップデータのロード =====
        this.load.tilemapTiledJSON('map-field01', 'assets/maps/field01.json');

        // ===== プレースホルダー画像の生成 =====
        // タイトル画面用のプレースホルダー
        this.createPlaceholderTexture('title-bg', 480, 320, 0x1a1a2e);

        // プレイヤースプライト用のプレースホルダー（16x16）
        this.createPlayerTexture();

        // 敵スプライト用のプレースホルダー
        this.createPlaceholderTexture('enemy-slime', 32, 32, 0xe94560);
        this.createPlaceholderTexture('enemy-bat', 24, 24, 0x8b5cf6);
        this.createPlaceholderTexture('enemy-goblin', 32, 32, 0xf59e0b);

        // バトル背景用のプレースホルダー
        this.createPlaceholderTexture('battle-bg', 480, 320, 0x1e3a5f);
    }

    /**
     * タイルセットテクスチャを生成 (4x2 = 8タイル)
     * タイル番号:
     * 1: 壁（ダークグレー）
     * 2: 草地（緑）
     * 3: 森の地面（ダークグリーン）
     * 4: 森の木（茶色）
     * 5: 建物の壁（茶色）
     * 6: 建物の床（ベージュ）
     * 7: ドア（木目）
     * 8: 木（装飾用）
     */
    private createTilesetTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const tileSize = 16;

        // タイル色の定義
        const tileColors = [
            0x4a5568, // 1: 壁（ダークグレー）
            0x22c55e, // 2: 草地（緑）
            0x166534, // 3: 森の地面（ダークグリーン）
            0x78350f, // 4: 木の幹（茶色）
            0x92400e, // 5: 建物の壁（レンガ色）
            0xfbbf24, // 6: 建物の床（ベージュ/金色）
            0x7c2d12, // 7: ドア（ダーク木目）
            0x15803d, // 8: 木（緑・装飾用）
        ];

        // 4x2グリッドでタイルを描画
        for (let i = 0; i < 8; i++) {
            const x = (i % 4) * tileSize;
            const y = Math.floor(i / 4) * tileSize;

            // ベースカラー
            graphics.fillStyle(tileColors[i], 1);
            graphics.fillRect(x, y, tileSize, tileSize);

            // タイルごとの装飾
            this.addTileDecoration(graphics, i, x, y, tileSize);
        }

        graphics.generateTexture('tileset-field', 64, 32);
        graphics.destroy();
    }

    /**
     * タイルに装飾を追加
     */
    private addTileDecoration(
        graphics: Phaser.GameObjects.Graphics,
        tileIndex: number,
        x: number,
        y: number,
        size: number
    ): void {
        switch (tileIndex) {
            case 0: // 壁 - レンガ模様
                graphics.lineStyle(1, 0x2d3748, 0.5);
                graphics.lineBetween(x, y + 4, x + size, y + 4);
                graphics.lineBetween(x, y + 8, x + size, y + 8);
                graphics.lineBetween(x, y + 12, x + size, y + 12);
                graphics.lineBetween(x + 8, y, x + 8, y + 4);
                graphics.lineBetween(x + 4, y + 4, x + 4, y + 8);
                graphics.lineBetween(x + 12, y + 4, x + 12, y + 8);
                graphics.lineBetween(x + 8, y + 8, x + 8, y + 12);
                graphics.lineBetween(x + 4, y + 12, x + 4, y + 16);
                graphics.lineBetween(x + 12, y + 12, x + 12, y + 16);
                break;

            case 1: // 草地 - ランダムな草模様
                graphics.fillStyle(0x16a34a, 0.5);
                graphics.fillRect(x + 3, y + 3, 2, 2);
                graphics.fillRect(x + 10, y + 7, 2, 2);
                graphics.fillRect(x + 6, y + 12, 2, 2);
                break;

            case 2: // 森の地面 - 暗い草
                graphics.fillStyle(0x14532d, 0.5);
                graphics.fillRect(x + 2, y + 5, 3, 2);
                graphics.fillRect(x + 9, y + 10, 3, 2);
                break;

            case 3: // 木の幹 - 模様
                graphics.fillStyle(0x451a03, 0.5);
                graphics.fillRect(x + 4, y + 2, 8, 12);
                graphics.fillStyle(0x166534, 1);
                graphics.fillCircle(x + 8, y + 2, 6);
                break;

            case 4: // 建物の壁 - レンガ
                graphics.lineStyle(1, 0x7c2d12, 0.5);
                graphics.lineBetween(x, y + 5, x + size, y + 5);
                graphics.lineBetween(x, y + 10, x + size, y + 10);
                break;

            case 5: // 建物の床 - タイル模様
                graphics.lineStyle(1, 0xd97706, 0.3);
                graphics.strokeRect(x + 1, y + 1, size - 2, size - 2);
                break;

            case 6: // ドア
                graphics.fillStyle(0x451a03, 1);
                graphics.fillRect(x + 3, y + 2, 10, 12);
                graphics.fillStyle(0xfbbf24, 1);
                graphics.fillCircle(x + 10, y + 8, 2);
                break;

            case 7: // 木（装飾）
                // 幹
                graphics.fillStyle(0x78350f, 1);
                graphics.fillRect(x + 6, y + 10, 4, 6);
                // 葉
                graphics.fillStyle(0x15803d, 1);
                graphics.fillCircle(x + 8, y + 6, 6);
                graphics.fillStyle(0x166534, 1);
                graphics.fillCircle(x + 8, y + 6, 4);
                break;
        }
    }

    /**
     * プレイヤーテクスチャを生成（より見やすいデザイン）
     */
    private createPlayerTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });

        // 体（緑）
        graphics.fillStyle(0x4ade80, 1);
        graphics.fillRect(4, 4, 8, 10);

        // 頭（明るい緑）
        graphics.fillStyle(0x86efac, 1);
        graphics.fillRect(5, 2, 6, 5);

        // 目
        graphics.fillStyle(0x1f2937, 1);
        graphics.fillRect(6, 4, 2, 2);
        graphics.fillRect(9, 4, 2, 2);

        // 足
        graphics.fillStyle(0x166534, 1);
        graphics.fillRect(4, 12, 3, 2);
        graphics.fillRect(9, 12, 3, 2);

        graphics.generateTexture('player', 16, 16);
        graphics.destroy();
    }

    /**
     * プレースホルダーテクスチャを生成
     */
    private createPlaceholderTexture(
        key: string,
        width: number,
        height: number,
        color: number
    ): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, width, height);

        // 枠線を追加
        graphics.lineStyle(1, 0xffffff, 0.3);
        graphics.strokeRect(0, 0, width, height);

        graphics.generateTexture(key, width, height);
        graphics.destroy();
    }

    create(): void {
        console.log('PreloadScene: Assets loaded');

        // タイトルシーンへ遷移
        this.scene.start('TitleScene');
    }
}
