/**
 * MapScene - フィールドマップシーン
 * FF6風のタイルマップ移動を実装
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@/config/gameConfig';

/** プレイヤーの移動速度 */
const PLAYER_SPEED = 100;

/** エンカウント率（1歩あたりの確率 %） */
const ENCOUNTER_RATE = 10;

export class MapScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };
    private stepCount: number = 0;
    private lastGridX: number = 0;
    private lastGridY: number = 0;
    private isMoving: boolean = false;
    private debugText!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'MapScene' });
    }

    create(): void {
        console.log('MapScene: Creating...');

        this.createTileMap();
        this.createPlayer();
        this.setupInput();
        this.setupCamera();
        this.createUI();

        // フェードイン
        this.cameras.main.fadeIn(500);
    }

    /**
     * タイルマップを作成（プレースホルダー）
     */
    private createTileMap(): void {
        const graphics = this.add.graphics();

        // グラス系の地面
        const grassColors = [0x22c55e, 0x16a34a, 0x15803d];

        const tilesX = Math.ceil(GAME_WIDTH / TILE_SIZE) + 4;
        const tilesY = Math.ceil(GAME_HEIGHT / TILE_SIZE) + 4;

        for (let y = 0; y < tilesY; y++) {
            for (let x = 0; x < tilesX; x++) {
                const colorIndex = (x + y) % grassColors.length;
                graphics.fillStyle(grassColors[colorIndex], 1);
                graphics.fillRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );

                // タイルの境界線
                graphics.lineStyle(1, 0x000000, 0.1);
                graphics.strokeRect(
                    x * TILE_SIZE,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
        }

        // 装飾：木や岩のプレースホルダー
        this.createDecorations();
    }

    /**
     * 装飾オブジェクトを作成
     */
    private createDecorations(): void {
        const decorPositions = [
            { x: 5, y: 3, type: 'tree' },
            { x: 12, y: 7, type: 'tree' },
            { x: 8, y: 12, type: 'rock' },
            { x: 20, y: 5, type: 'tree' },
            { x: 25, y: 15, type: 'rock' },
        ];

        decorPositions.forEach(pos => {
            const graphics = this.add.graphics();

            if (pos.type === 'tree') {
                // 木の幹
                graphics.fillStyle(0x8b4513, 1);
                graphics.fillRect(
                    pos.x * TILE_SIZE + 6,
                    pos.y * TILE_SIZE + 8,
                    4,
                    8
                );
                // 木の葉
                graphics.fillStyle(0x228b22, 1);
                graphics.fillCircle(
                    pos.x * TILE_SIZE + 8,
                    pos.y * TILE_SIZE + 4,
                    8
                );
            } else if (pos.type === 'rock') {
                graphics.fillStyle(0x708090, 1);
                graphics.fillCircle(
                    pos.x * TILE_SIZE + 8,
                    pos.y * TILE_SIZE + 8,
                    6
                );
            }
        });
    }

    /**
     * プレイヤーを作成
     */
    private createPlayer(): void {
        const startX = GAME_WIDTH / 2;
        const startY = GAME_HEIGHT / 2;

        // プレイヤー（とりあえず矩形で表現）
        this.player = this.add.rectangle(
            startX,
            startY,
            TILE_SIZE - 2,
            TILE_SIZE - 2,
            0x4ade80
        );

        // 物理演算を有効化
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);

        // 初期グリッド位置を記録
        this.lastGridX = Math.floor(startX / TILE_SIZE);
        this.lastGridY = Math.floor(startY / TILE_SIZE);
    }

    /**
     * 入力のセットアップ
     */
    private setupInput(): void {
        // カーソルキー
        this.cursors = this.input.keyboard!.createCursorKeys();

        // WASD
        this.wasd = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // ESCでタイトルに戻る（デバッグ用）
        this.input.keyboard?.on('keydown-ESC', () => {
            this.returnToTitle();
        });

        // Bキーでバトル画面へ（デバッグ用）
        this.input.keyboard?.on('keydown-B', () => {
            this.startBattle();
        });
    }

    /**
     * カメラのセットアップ
     */
    private setupCamera(): void {
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(2);
    }

    /**
     * UIを作成
     */
    private createUI(): void {
        // デバッグ情報
        this.debugText = this.add.text(10, 10, '', {
            fontFamily: 'monospace',
            fontSize: '8px',
            color: '#ffffff',
            backgroundColor: '#000000'
        });
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(1000);
    }

    /**
     * 毎フレームの更新処理
     */
    update(): void {
        this.handleMovement();
        this.checkEncounter();
        this.updateDebugInfo();
    }

    /**
     * 移動処理
     */
    private handleMovement(): void {
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0);

        let velocityX = 0;
        let velocityY = 0;

        // 左右移動
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -PLAYER_SPEED;
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = PLAYER_SPEED;
        }

        // 上下移動
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -PLAYER_SPEED;
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = PLAYER_SPEED;
        }

        // 斜め移動の正規化
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.7071; // 1/√2
            velocityY *= 0.7071;
        }

        body.setVelocity(velocityX, velocityY);
        this.isMoving = velocityX !== 0 || velocityY !== 0;
    }

    /**
     * エンカウント判定
     */
    private checkEncounter(): void {
        if (!this.isMoving) return;

        const currentGridX = Math.floor(this.player.x / TILE_SIZE);
        const currentGridY = Math.floor(this.player.y / TILE_SIZE);

        // グリッド位置が変わった場合のみ判定
        if (currentGridX !== this.lastGridX || currentGridY !== this.lastGridY) {
            this.lastGridX = currentGridX;
            this.lastGridY = currentGridY;
            this.stepCount++;

            // エンカウント判定
            if (Phaser.Math.Between(1, 100) <= ENCOUNTER_RATE) {
                this.startBattle();
            }
        }
    }

    /**
     * バトル開始
     */
    private startBattle(): void {
        // 入力を無効化
        this.input.keyboard?.removeAllKeys();

        // フラッシュ効果
        this.cameras.main.flash(300, 255, 255, 255);

        this.time.delayedCall(300, () => {
            this.cameras.main.fadeOut(200, 0, 0, 0);
        });

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('BattleScene', {
                enemyType: this.getRandomEnemy(),
                returnScene: 'MapScene',
                playerPosition: { x: this.player.x, y: this.player.y }
            });
        });
    }

    /**
     * ランダムな敵を取得
     */
    private getRandomEnemy(): string {
        const enemies = ['slime', 'bat', 'goblin'];
        return enemies[Phaser.Math.Between(0, enemies.length - 1)];
    }

    /**
     * タイトルに戻る
     */
    private returnToTitle(): void {
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }

    /**
     * デバッグ情報を更新
     */
    private updateDebugInfo(): void {
        const gridX = Math.floor(this.player.x / TILE_SIZE);
        const gridY = Math.floor(this.player.y / TILE_SIZE);

        this.debugText.setText([
            `Steps: ${this.stepCount}`,
            `Grid: (${gridX}, ${gridY})`,
            `[ESC] Title  [B] Battle`
        ].join('\n'));
    }
}
