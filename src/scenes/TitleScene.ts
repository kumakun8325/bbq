/**
 * TitleScene - タイトル画面
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';

export class TitleScene extends Phaser.Scene {
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;
    private startText!: Phaser.GameObjects.Text;
    private versionText!: Phaser.GameObjects.Text;
    private blinkTimer?: Phaser.Time.TimerEvent;

    constructor() {
        super({ key: 'TitleScene' });
    }

    create(): void {
        console.log('TitleScene: Creating...');

        this.createBackground();
        this.createTitleText();
        this.createStartPrompt();
        this.createVersionInfo();
        this.setupInput();
        this.playEntryAnimation();
    }

    /**
     * 背景を作成
     */
    private createBackground(): void {
        // グラデーション風の背景
        const bg = this.add.graphics();

        // 上から下へのグラデーション（複数の矩形で表現）
        const colors = [0x1a1a2e, 0x16213e, 0x0f3460];
        const segmentHeight = GAME_HEIGHT / colors.length;

        colors.forEach((color, index) => {
            bg.fillStyle(color, 1);
            bg.fillRect(0, index * segmentHeight, GAME_WIDTH, segmentHeight + 1);
        });

        // 星の装飾
        this.createStars();
    }

    /**
     * 星を作成
     */
    private createStars(): void {
        const graphics = this.add.graphics();

        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(0, GAME_HEIGHT);
            const alpha = Phaser.Math.FloatBetween(0.3, 1);
            const size = Phaser.Math.Between(1, 2);

            graphics.fillStyle(0xffffff, alpha);
            graphics.fillCircle(x, y, size);
        }

        // 星のきらめきアニメーション
        this.tweens.add({
            targets: graphics,
            alpha: { from: 0.7, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * タイトルテキストを作成
     */
    private createTitleText(): void {
        const centerX = GAME_WIDTH / 2;

        // メインタイトル
        this.titleText = this.add.text(centerX, 80, 'BBQ', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '48px',
            color: '#e94560',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.titleText.setOrigin(0.5);
        this.titleText.setAlpha(0);

        // サブタイトル
        this.subtitleText = this.add.text(centerX, 130, 'Bird Battle Quest', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#fbbf24'
        });
        this.subtitleText.setOrigin(0.5);
        this.subtitleText.setAlpha(0);
    }

    /**
     * スタートプロンプトを作成
     */
    private createStartPrompt(): void {
        this.startText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT - 80,
            'PRESS SPACE OR TAP TO START',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#ffffff'
            }
        );
        this.startText.setOrigin(0.5);
        this.startText.setAlpha(0);

        // 点滅アニメーション
        this.blinkTimer = this.time.addEvent({
            delay: 500,
            callback: () => {
                if (this.startText.alpha > 0) {
                    this.startText.setAlpha(this.startText.alpha === 1 ? 0.3 : 1);
                }
            },
            loop: true
        });
    }

    /**
     * バージョン情報を作成
     */
    private createVersionInfo(): void {
        this.versionText = this.add.text(
            GAME_WIDTH - 10,
            GAME_HEIGHT - 10,
            'v0.1.0 MVP',
            {
                fontFamily: 'monospace',
                fontSize: '8px',
                color: '#666666'
            }
        );
        this.versionText.setOrigin(1, 1);
    }

    /**
     * 入力のセットアップ
     */
    private setupInput(): void {
        // キーボード入力
        this.input.keyboard?.on('keydown-SPACE', () => {
            this.startGame();
        });

        this.input.keyboard?.on('keydown-ENTER', () => {
            this.startGame();
        });

        // タップ/クリック入力
        this.input.on('pointerdown', () => {
            this.startGame();
        });
    }

    /**
     * エントリーアニメーションを再生
     */
    private playEntryAnimation(): void {
        // タイトルのフェードイン
        this.tweens.add({
            targets: this.titleText,
            alpha: 1,
            y: { from: 60, to: 80 },
            duration: 1000,
            ease: 'Back.easeOut'
        });

        // サブタイトルのフェードイン（遅延）
        this.tweens.add({
            targets: this.subtitleText,
            alpha: 1,
            duration: 800,
            delay: 500,
            ease: 'Power2'
        });

        // スタートプロンプトのフェードイン（さらに遅延）
        this.tweens.add({
            targets: this.startText,
            alpha: 1,
            duration: 500,
            delay: 1200,
            ease: 'Power2'
        });
    }

    /**
     * ゲームを開始
     */
    private startGame(): void {
        // 連打防止
        this.input.keyboard?.removeAllKeys();
        this.input.removeAllListeners();

        // フェードアウトしてマップシーンへ
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.blinkTimer) {
                this.blinkTimer.destroy();
            }
            this.scene.start('MapScene');
        });
    }

    /**
     * シーン破棄時のクリーンアップ
     */
    shutdown(): void {
        if (this.blinkTimer) {
            this.blinkTimer.destroy();
        }
    }
}
