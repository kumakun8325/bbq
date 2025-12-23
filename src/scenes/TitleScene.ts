/**
 * TitleScene - タイトル画面
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';
import { SaveManager } from '@/managers/SaveManager';
import { GameStateManager } from '@/managers/GameStateManager';

type MenuOption = 'continue' | 'newgame';

export class TitleScene extends Phaser.Scene {
    private titleText!: Phaser.GameObjects.Text;
    private subtitleText!: Phaser.GameObjects.Text;
    private versionText!: Phaser.GameObjects.Text;
    private blinkTimer?: Phaser.Time.TimerEvent;

    // メニュー関連
    private menuItems: Phaser.GameObjects.Text[] = [];
    private selectedIndex: number = 0;
    private hasSaveData: boolean = false;
    private cursor!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'TitleScene' });
    }

    create(): void {
        console.log('TitleScene: Creating...');

        // セーブデータの存在確認
        this.hasSaveData = SaveManager.getInstance().hasSaveData();

        this.createBackground();
        this.createTitleText();
        this.createMenu();
        this.createVersionInfo();
        this.setupInput();
        this.playEntryAnimation();
    }

    /**
     * 背景を作成
     */
    private createBackground(): void {
        const bg = this.add.graphics();
        const colors = [0x1a1a2e, 0x16213e, 0x0f3460];
        const segmentHeight = GAME_HEIGHT / colors.length;

        colors.forEach((color, index) => {
            bg.fillStyle(color, 1);
            bg.fillRect(0, index * segmentHeight, GAME_WIDTH, segmentHeight + 1);
        });

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

        this.titleText = this.add.text(centerX, 80, 'BBQ', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '48px',
            color: '#e94560',
            stroke: '#000000',
            strokeThickness: 4
        });
        this.titleText.setOrigin(0.5);
        this.titleText.setAlpha(0);

        this.subtitleText = this.add.text(centerX, 130, 'Bird Battle Quest', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#fbbf24'
        });
        this.subtitleText.setOrigin(0.5);
        this.subtitleText.setAlpha(0);
    }

    /**
     * メニューを作成
     */
    private createMenu(): void {
        const centerX = GAME_WIDTH / 2;
        const menuStartY = GAME_HEIGHT - 120; // 少し上に上げる
        const menuSpacing = 60; // 間隔を広げる

        this.menuItems = [];

        // セーブデータがある場合は「つづきから」を最初に表示
        if (this.hasSaveData) {
            const continueText = this.add.text(centerX, menuStartY, 'つづきから', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '24px',
                color: '#ffffff'
            });
            continueText.setOrigin(0.5);
            continueText.setAlpha(0);
            continueText.setData('action', 'continue');
            this.menuItems.push(continueText);
        }

        // 「はじめから」は常に表示
        const newGameY = this.hasSaveData ? menuStartY + menuSpacing : menuStartY;
        const newGameText = this.add.text(centerX, newGameY, 'はじめから', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '24px',
            color: '#ffffff'
        });
        newGameText.setOrigin(0.5);
        newGameText.setAlpha(0);
        newGameText.setData('action', 'newgame');
        this.menuItems.push(newGameText);

        // カーソル作成
        this.cursor = this.add.text(
            centerX - 140, // 位置調整
            this.menuItems[0].y,
            '▶',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '24px',
                color: '#fbbf24'
            }
        );
        this.cursor.setOrigin(0.5);
        this.cursor.setAlpha(0);

        // カーソル点滅
        this.blinkTimer = this.time.addEvent({
            delay: 400,
            callback: () => {
                if (this.cursor.alpha > 0) {
                    this.cursor.setAlpha(this.cursor.alpha === 1 ? 0.3 : 1);
                }
            },
            loop: true
        });

        this.updateMenuSelection();
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
        this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
        this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
        this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));

        this.input.keyboard?.on('keydown-SPACE', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-Z', () => this.confirmSelection());

        // クリック入力（メニュー項目）
        this.menuItems.forEach((item, index) => {
            item.setInteractive({ useHandCursor: true });
            item.on('pointerover', () => {
                this.selectedIndex = index;
                this.updateMenuSelection();
            });
            item.on('pointerdown', () => {
                this.selectedIndex = index;
                this.confirmSelection();
            });
        });
    }

    /**
     * 選択を移動
     */
    private moveSelection(direction: number): void {
        this.selectedIndex = Phaser.Math.Wrap(
            this.selectedIndex + direction,
            0,
            this.menuItems.length
        );
        this.updateMenuSelection();
    }

    /**
     * メニュー選択状態を更新
     */
    private updateMenuSelection(): void {
        this.menuItems.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.setColor('#fbbf24');
            } else {
                item.setColor('#ffffff');
            }
        });

        if (this.cursor && this.menuItems[this.selectedIndex]) {
            this.cursor.setY(this.menuItems[this.selectedIndex].y);
        }
    }

    /**
     * 選択を確定
     */
    private confirmSelection(): void {
        const action = this.menuItems[this.selectedIndex].getData('action') as MenuOption;

        this.input.keyboard?.removeAllKeys();
        this.input.removeAllListeners();

        if (action === 'continue') {
            this.goToSaveLoadScene();
        } else {
            this.startNewGame();
        }
    }

    /**
     * セーブデータ選択画面へ
     */
    private goToSaveLoadScene(): void {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.blinkTimer) {
                this.blinkTimer.destroy();
            }
            this.scene.start('SaveLoadScene');
        });
    }

    /**
     * 新規ゲームを開始
     */
    private startNewGame(): void {
        GameStateManager.getInstance().reset();
        console.log('Starting new game');

        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.blinkTimer) {
                this.blinkTimer.destroy();
            }
            this.scene.start('MapScene');
        });
    }

    /**
     * エントリーアニメーションを再生
     */
    private playEntryAnimation(): void {
        this.tweens.add({
            targets: this.titleText,
            alpha: 1,
            y: { from: 60, to: 80 },
            duration: 1000,
            ease: 'Back.easeOut'
        });

        this.tweens.add({
            targets: this.subtitleText,
            alpha: 1,
            duration: 800,
            delay: 500,
            ease: 'Power2'
        });

        const menuTargets: Phaser.GameObjects.GameObject[] = [...this.menuItems, this.cursor];
        this.tweens.add({
            targets: menuTargets,
            alpha: 1,
            duration: 500,
            delay: 1200,
            ease: 'Power2'
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
