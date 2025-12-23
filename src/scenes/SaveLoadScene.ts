/**
 * SaveLoadScene - セーブ/ロード選択画面
 * FF6風のセーブスロット選択UI
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';
import { SaveManager, SaveSlotInfo, SAVE_SLOTS, SaveSlotId } from '@/managers/SaveManager';
import { GameStateManager } from '@/managers/GameStateManager';
import { PLAYABLE_CHARACTERS } from '@/data/characters';

export class SaveLoadScene extends Phaser.Scene {
    private slots: SaveSlotInfo[] = [];
    private selectedIndex: number = 0;
    private slotContainers: Phaser.GameObjects.Container[] = [];
    private cursor!: Phaser.GameObjects.Text;
    private blinkTimer?: Phaser.Time.TimerEvent;

    constructor() {
        super({ key: 'SaveLoadScene' });
    }

    create(): void {
        console.log('SaveLoadScene: Creating...');

        this.createBackground();
        this.loadSlotData();
        this.createHeader();
        this.createSlotList();
        this.createCursor();
        this.setupInput();

        // フェードイン
        this.cameras.main.fadeIn(300);
    }

    /**
     * 背景を作成
     */
    private createBackground(): void {
        // 暗い背景
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 枠線
        bg.lineStyle(2, 0x4a5568, 1);
        bg.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
    }

    /**
     * スロットデータを読み込み
     */
    private loadSlotData(): void {
        this.slots = SaveManager.getInstance().getAllSlotInfo();
    }

    /**
     * ヘッダーを作成
     */
    private createHeader(): void {
        const title = this.add.text(GAME_WIDTH / 2, 25, 'つづきから', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '14px',
            color: '#fbbf24'
        });
        title.setOrigin(0.5);

        // 操作説明
        const help = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, '↑↓:せんたく  Z:けってい  X:もどる', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '8px',
            color: '#888888'
        });
        help.setOrigin(0.5);
    }

    /**
     * スロット一覧を作成
     */
    private createSlotList(): void {
        const startY = 55;
        const slotHeight = 60;

        this.slots.forEach((slot, index) => {
            const y = startY + index * slotHeight;
            const container = this.createSlotContainer(slot, y);
            this.slotContainers.push(container);
        });
    }

    /**
     * スロットコンテナを作成
     */
    private createSlotContainer(slot: SaveSlotInfo, y: number): Phaser.GameObjects.Container {
        const container = this.add.container(0, y);
        const slotWidth = GAME_WIDTH - 60;
        const slotX = 30;

        // 背景ボックス
        const bg = this.add.graphics();
        bg.fillStyle(0x16213e, 1);
        bg.fillRoundedRect(slotX, 0, slotWidth, 52, 4);
        bg.lineStyle(1, 0x4a5568, 1);
        bg.strokeRoundedRect(slotX, 0, slotWidth, 52, 4);
        container.add(bg);

        // スロット名（オートセーブなど）
        const slotLabel = this.add.text(slotX + 8, 6, slot.slotName, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '9px',
            color: slot.slotId === SAVE_SLOTS.AUTO ? '#4ade80' : '#60a5fa'
        });
        container.add(slotLabel);

        if (slot.isEmpty) {
            // 空きスロット
            const emptyText = this.add.text(slotX + slotWidth / 2, 30, '--- データなし ---', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#666666'
            });
            emptyText.setOrigin(0.5);
            container.add(emptyText);
        } else {
            // パーティメンバースプライト
            const spriteStartX = slotX + 10;
            const spriteY = 34;

            slot.partyIds?.forEach((charId, i) => {
                const charDef = PLAYABLE_CHARACTERS[charId];
                if (charDef) {
                    // バトルスプライトを使用
                    const sprite = this.add.sprite(
                        spriteStartX + i * 28,
                        spriteY,
                        charDef.battleSpriteKey
                    );
                    sprite.setScale(1.5);
                    sprite.setOrigin(0.5, 0.5);
                    container.add(sprite);
                }
            });

            // レベル表示
            const levelText = this.add.text(slotX + 130, 22, `Lv.${slot.maxLevel}`, {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#fbbf24'
            });
            container.add(levelText);

            // 場所表示
            const locationText = this.add.text(slotX + 130, 36, slot.location || '', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff'
            });
            container.add(locationText);

            // 日付表示
            const dateText = this.add.text(slotX + slotWidth - 10, 8, slot.timestamp || '', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#888888'
            });
            dateText.setOrigin(1, 0);
            container.add(dateText);

            // プレイ時間
            const timeText = this.add.text(slotX + slotWidth - 10, 38, slot.playtime || '', {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#60a5fa'
            });
            timeText.setOrigin(1, 0);
            container.add(timeText);
        }

        return container;
    }

    /**
     * カーソルを作成
     */
    private createCursor(): void {
        this.cursor = this.add.text(18, 0, '▶', {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#fbbf24'
        });

        this.updateCursorPosition();

        // 点滅アニメーション
        this.blinkTimer = this.time.addEvent({
            delay: 400,
            callback: () => {
                this.cursor.setAlpha(this.cursor.alpha === 1 ? 0.3 : 1);
            },
            loop: true
        });
    }

    /**
     * カーソル位置を更新
     */
    private updateCursorPosition(): void {
        const slotHeight = 60;
        const startY = 55;
        this.cursor.setY(startY + this.selectedIndex * slotHeight + 20);
    }

    /**
     * 選択状態を更新
     */
    private updateSelection(): void {
        this.slotContainers.forEach((container, index) => {
            const bg = container.list[0] as Phaser.GameObjects.Graphics;
            bg.clear();

            if (index === this.selectedIndex) {
                // 選択中は明るい背景
                bg.fillStyle(0x2d3748, 1);
                bg.fillRoundedRect(30, 0, GAME_WIDTH - 60, 52, 4);
                bg.lineStyle(2, 0xfbbf24, 1);
                bg.strokeRoundedRect(30, 0, GAME_WIDTH - 60, 52, 4);
            } else {
                bg.fillStyle(0x16213e, 1);
                bg.fillRoundedRect(30, 0, GAME_WIDTH - 60, 52, 4);
                bg.lineStyle(1, 0x4a5568, 1);
                bg.strokeRoundedRect(30, 0, GAME_WIDTH - 60, 52, 4);
            }
        });

        this.updateCursorPosition();
    }

    /**
     * 入力のセットアップ
     */
    private setupInput(): void {
        this.input.keyboard?.on('keydown-UP', () => this.moveSelection(-1));
        this.input.keyboard?.on('keydown-W', () => this.moveSelection(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.moveSelection(1));
        this.input.keyboard?.on('keydown-S', () => this.moveSelection(1));

        this.input.keyboard?.on('keydown-Z', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-SPACE', () => this.confirmSelection());
        this.input.keyboard?.on('keydown-ENTER', () => this.confirmSelection());

        this.input.keyboard?.on('keydown-X', () => this.goBack());
        this.input.keyboard?.on('keydown-ESC', () => this.goBack());

        // クリック入力
        this.slotContainers.forEach((container, index) => {
            container.setInteractive(
                new Phaser.Geom.Rectangle(30, 0, GAME_WIDTH - 60, 52),
                Phaser.Geom.Rectangle.Contains
            );
            container.on('pointerover', () => {
                this.selectedIndex = index;
                this.updateSelection();
            });
            container.on('pointerdown', () => {
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
            this.slots.length
        );
        this.updateSelection();
    }

    /**
     * 選択を確定
     */
    private confirmSelection(): void {
        const slot = this.slots[this.selectedIndex];

        if (slot.isEmpty) {
            // 空きスロットはブザー音的な演出（将来）
            console.log('Empty slot selected');
            return;
        }

        // 連打防止
        this.input.keyboard?.removeAllKeys();
        this.input.removeAllListeners();

        this.loadGame(slot.slotId);
    }

    /**
     * ゲームをロード
     */
    private loadGame(slotId: SaveSlotId): void {
        const saveManager = SaveManager.getInstance();
        const saveData = saveManager.load(slotId);

        if (saveData) {
            saveManager.applyToGameState(saveData);
            console.log(`Game loaded from slot ${slotId}`);

            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                if (this.blinkTimer) {
                    this.blinkTimer.destroy();
                }
                this.scene.start('MapScene');
            });
        } else {
            console.error('Failed to load save data');
        }
    }

    /**
     * タイトルに戻る
     */
    private goBack(): void {
        this.input.keyboard?.removeAllKeys();
        this.input.removeAllListeners();

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            if (this.blinkTimer) {
                this.blinkTimer.destroy();
            }
            this.scene.start('TitleScene');
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
