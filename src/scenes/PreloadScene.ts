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
        // ===== プレースホルダー画像の生成 =====
        // 実際のアセットが用意されるまで、プログラムで生成

        // タイトル画面用のプレースホルダー
        this.createPlaceholderTexture('title-bg', 480, 320, 0x1a1a2e);

        // プレイヤースプライト用のプレースホルダー（16x16）
        this.createPlaceholderTexture('player', 16, 16, 0x4ade80);

        // 敵スプライト用のプレースホルダー
        this.createPlaceholderTexture('enemy-slime', 32, 32, 0xe94560);
        this.createPlaceholderTexture('enemy-bat', 24, 24, 0x8b5cf6);
        this.createPlaceholderTexture('enemy-goblin', 32, 32, 0xf59e0b);

        // マップタイル用のプレースホルダー（16x16のタイルセット）
        this.createPlaceholderTexture('tileset-field', 64, 64, 0x22c55e);

        // バトル背景用のプレースホルダー
        this.createPlaceholderTexture('battle-bg', 480, 320, 0x1e3a5f);
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
