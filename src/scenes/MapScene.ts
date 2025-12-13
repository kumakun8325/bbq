/**
 * MapScene - フィールドマップシーン
 * Tiledマップを使用したFF6風の移動システム
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE } from '@/config/gameConfig';

/** プレイヤーの移動速度 */
const PLAYER_SPEED = 80;

/** エンカウント率（1歩あたりの確率 %） */
const ENCOUNTER_RATE = 8;

/** エンカウントまでの最小歩数 */
const MIN_STEPS_BEFORE_ENCOUNTER = 5;

/** マップデータ型 */
interface MapData {
    width: number;
    height: number;
    layers: {
        name: string;
        data: number[];
    }[];
}

export class MapScene extends Phaser.Scene {
    // マップ関連
    private mapData!: MapData;
    private groundGraphics!: Phaser.GameObjects.Graphics;
    private collisionMap: boolean[][] = [];

    // プレイヤー関連
    private player!: Phaser.GameObjects.Sprite;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    // 移動状態
    private isMoving: boolean = false;
    private currentDirection: string = 'down'; // 現在の向き

    // エンカウント関連
    private stepCount: number = 0;
    private lastGridX: number = 0;
    private lastGridY: number = 0;
    private stepsSinceLastEncounter: number = 0;

    // UI
    private debugText!: Phaser.GameObjects.Text;

    // タイル色定義
    private readonly tileColors: { [key: number]: number } = {
        0: 0x000000, // 空（透明）
        1: 0x4a5568, // 壁（ダークグレー）
        2: 0x22c55e, // 草地（緑）
        3: 0x166534, // 森の地面（ダークグリーン）
        4: 0x78350f, // 木の幹（茶色）
        5: 0x92400e, // 建物の壁（レンガ色）
        6: 0xfbbf24, // 建物の床（ベージュ/金色）
        7: 0x7c2d12, // ドア（ダーク木目）
        8: 0x15803d, // 木（緑・装飾用）
    };

    constructor() {
        super({ key: 'MapScene' });
    }

    init(data: { playerPosition?: { x: number; y: number } }): void {
        // バトルから戻ってきた場合の位置復元
        if (data.playerPosition) {
            this.lastGridX = Math.floor(data.playerPosition.x / TILE_SIZE);
            this.lastGridY = Math.floor(data.playerPosition.y / TILE_SIZE);
        }
    }

    create(): void {
        console.log('MapScene: Creating...');

        this.loadMapData();
        this.createMapGraphics();
        this.createPlayer();
        this.createCollisionMap();
        this.setupInput();
        this.setupCamera();
        this.createUI();

        // フェードイン
        this.cameras.main.fadeIn(500);
    }

    /**
     * マップデータをキャッシュから取得
     */
    private loadMapData(): void {
        const jsonData = this.cache.tilemap.get('map-field01');
        if (jsonData && jsonData.data) {
            this.mapData = {
                width: jsonData.data.width,
                height: jsonData.data.height,
                layers: jsonData.data.layers.map((layer: { name: string; data: number[] }) => ({
                    name: layer.name,
                    data: layer.data
                }))
            };
            console.log('Map loaded:', this.mapData.width, 'x', this.mapData.height);
        } else {
            // フォールバック: デフォルトマップ
            console.warn('Map data not found, using fallback');
            this.createFallbackMapData();
        }
    }

    /**
     * フォールバック用のマップデータを生成
     */
    private createFallbackMapData(): void {
        const width = 30;
        const height = 20;
        const groundData: number[] = [];
        const collisionData: number[] = [];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // 外周は壁
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    groundData.push(1);
                    collisionData.push(1);
                } else {
                    groundData.push(2); // 草地
                    collisionData.push(0);
                }
            }
        }

        this.mapData = {
            width,
            height,
            layers: [
                { name: 'ground', data: groundData },
                { name: 'decoration', data: [] },
                { name: 'collision', data: collisionData }
            ]
        };
    }

    /**
     * マップをGraphicsで描画
     */
    private createMapGraphics(): void {
        this.groundGraphics = this.add.graphics();
        this.groundGraphics.setDepth(0);

        const groundLayer = this.mapData.layers.find(l => l.name === 'ground');
        const decorationLayer = this.mapData.layers.find(l => l.name === 'decoration');

        if (!groundLayer) return;

        // 地面レイヤーを描画
        for (let y = 0; y < this.mapData.height; y++) {
            for (let x = 0; x < this.mapData.width; x++) {
                const index = y * this.mapData.width + x;
                const tileId = groundLayer.data[index];

                if (tileId > 0) {
                    this.drawTile(x, y, tileId);
                }
            }
        }

        // 装飾レイヤーを描画
        if (decorationLayer && decorationLayer.data.length > 0) {
            for (let y = 0; y < this.mapData.height; y++) {
                for (let x = 0; x < this.mapData.width; x++) {
                    const index = y * this.mapData.width + x;
                    const tileId = decorationLayer.data[index];

                    if (tileId > 0) {
                        this.drawDecoration(x, y, tileId);
                    }
                }
            }
        }
    }

    /**
     * タイルを描画
     */
    private drawTile(x: number, y: number, tileId: number): void {
        const color = this.tileColors[tileId] || 0x000000;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        this.groundGraphics.fillStyle(color, 1);
        this.groundGraphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        // タイルごとの装飾
        this.addTileDecoration(tileId, px, py);
    }

    /**
     * タイルに装飾を追加
     */
    private addTileDecoration(tileId: number, px: number, py: number): void {
        switch (tileId) {
            case 1: // 壁 - レンガ模様
                this.groundGraphics.lineStyle(1, 0x2d3748, 0.5);
                this.groundGraphics.lineBetween(px, py + 4, px + TILE_SIZE, py + 4);
                this.groundGraphics.lineBetween(px, py + 8, px + TILE_SIZE, py + 8);
                this.groundGraphics.lineBetween(px, py + 12, px + TILE_SIZE, py + 12);
                break;

            case 2: // 草地 - ランダムな草模様
                this.groundGraphics.fillStyle(0x16a34a, 0.5);
                this.groundGraphics.fillRect(px + 3, py + 3, 2, 2);
                this.groundGraphics.fillRect(px + 10, py + 7, 2, 2);
                this.groundGraphics.fillRect(px + 6, py + 12, 2, 2);
                break;

            case 3: // 森の地面
                this.groundGraphics.fillStyle(0x14532d, 0.5);
                this.groundGraphics.fillRect(px + 2, py + 5, 3, 2);
                this.groundGraphics.fillRect(px + 9, py + 10, 3, 2);
                break;

            case 4: // 木の幹
                this.groundGraphics.fillStyle(0x451a03, 0.5);
                this.groundGraphics.fillRect(px + 4, py + 2, 8, 12);
                this.groundGraphics.fillStyle(0x166534, 1);
                this.groundGraphics.fillCircle(px + 8, py + 2, 6);
                break;

            case 5: // 建物の壁
                this.groundGraphics.lineStyle(1, 0x7c2d12, 0.5);
                this.groundGraphics.lineBetween(px, py + 5, px + TILE_SIZE, py + 5);
                this.groundGraphics.lineBetween(px, py + 10, px + TILE_SIZE, py + 10);
                break;

            case 6: // 建物の床
                this.groundGraphics.lineStyle(1, 0xd97706, 0.3);
                this.groundGraphics.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
                break;

            case 7: // ドア
                this.groundGraphics.fillStyle(0x451a03, 1);
                this.groundGraphics.fillRect(px + 3, py + 2, 10, 12);
                this.groundGraphics.fillStyle(0xfbbf24, 1);
                this.groundGraphics.fillCircle(px + 10, py + 8, 2);
                break;
        }
    }

    /**
     * 装飾を描画
     */
    private drawDecoration(x: number, y: number, tileId: number): void {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tileId === 8) {
            // 木
            this.groundGraphics.fillStyle(0x78350f, 1);
            this.groundGraphics.fillRect(px + 6, py + 10, 4, 6);
            this.groundGraphics.fillStyle(0x15803d, 1);
            this.groundGraphics.fillCircle(px + 8, py + 6, 6);
            this.groundGraphics.fillStyle(0x166534, 1);
            this.groundGraphics.fillCircle(px + 8, py + 6, 4);
        }
    }

    /**
     * 衝突マップを作成
     */
    private createCollisionMap(): void {
        const collisionLayer = this.mapData.layers.find(l => l.name === 'collision');
        if (!collisionLayer) return;

        this.collisionMap = [];
        for (let y = 0; y < this.mapData.height; y++) {
            this.collisionMap[y] = [];
            for (let x = 0; x < this.mapData.width; x++) {
                const index = y * this.mapData.width + x;
                this.collisionMap[y][x] = collisionLayer.data[index] > 0;
            }
        }
    }

    /**
     * プレイヤーを作成
     */
    private createPlayer(): void {
        // 初期位置（マップ中央付近）
        let startX = 15 * TILE_SIZE + TILE_SIZE / 2;
        let startY = 13 * TILE_SIZE + TILE_SIZE / 2;

        // バトルから戻ってきた場合は前の位置を使用
        if (this.lastGridX > 0 || this.lastGridY > 0) {
            startX = this.lastGridX * TILE_SIZE + TILE_SIZE / 2;
            startY = this.lastGridY * TILE_SIZE + TILE_SIZE / 2;
        }

        // プレイヤースプライト（スプライトシート使用）
        this.player = this.add.sprite(startX, startY, 'player', 0);
        this.player.setDepth(10);

        // 物理演算を有効化
        this.physics.add.existing(this.player);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(12, 12);
        body.setOffset(2, 2);

        // 初期グリッド位置を記録
        this.lastGridX = Math.floor(startX / TILE_SIZE);
        this.lastGridY = Math.floor(startY / TILE_SIZE);

        // 初期アニメーション（下向き待機）
        this.player.play('player-idle-down');
        this.currentDirection = 'down';
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

        // ESCでタイトルに戻る
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
        // カメラがプレイヤーを追従
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // ズーム
        this.cameras.main.setZoom(2);

        // カメラの境界を設定
        this.cameras.main.setBounds(
            0,
            0,
            this.mapData.width * TILE_SIZE,
            this.mapData.height * TILE_SIZE
        );
    }

    /**
     * UIを作成
     */
    private createUI(): void {
        this.debugText = this.add.text(4, 4, '', {
            fontFamily: 'monospace',
            fontSize: '6px',
            color: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 2, y: 2 }
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
     * 移動処理（衝突判定付き）
     */
    private handleMovement(): void {
        const body = this.player.body as Phaser.Physics.Arcade.Body;

        let velocityX = 0;
        let velocityY = 0;
        let newDirection = this.currentDirection;

        // 左右移動
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
            velocityX = -PLAYER_SPEED;
            newDirection = 'left';
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
            velocityX = PLAYER_SPEED;
            newDirection = 'right';
        }

        // 上下移動
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
            velocityY = -PLAYER_SPEED;
            newDirection = 'up';
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
            velocityY = PLAYER_SPEED;
            newDirection = 'down';
        }

        // 斜め移動の正規化
        if (velocityX !== 0 && velocityY !== 0) {
            velocityX *= 0.7071;
            velocityY *= 0.7071;
        }

        // 衝突判定
        const nextX = this.player.x + velocityX * 0.016;
        const nextY = this.player.y + velocityY * 0.016;

        const nextGridX = Math.floor(nextX / TILE_SIZE);
        const nextGridY = Math.floor(nextY / TILE_SIZE);

        // X方向の衝突チェック
        if (velocityX !== 0) {
            const checkX = velocityX > 0
                ? Math.floor((nextX + 6) / TILE_SIZE)
                : Math.floor((nextX - 6) / TILE_SIZE);
            const checkY = Math.floor(this.player.y / TILE_SIZE);

            if (this.isCollision(checkX, checkY)) {
                velocityX = 0;
            }
        }

        // Y方向の衝突チェック
        if (velocityY !== 0) {
            const checkX = Math.floor(this.player.x / TILE_SIZE);
            const checkY = velocityY > 0
                ? Math.floor((nextY + 6) / TILE_SIZE)
                : Math.floor((nextY - 6) / TILE_SIZE);

            if (this.isCollision(checkX, checkY)) {
                velocityY = 0;
            }
        }

        body.setVelocity(velocityX, velocityY);

        const wasMoving = this.isMoving;
        this.isMoving = velocityX !== 0 || velocityY !== 0;

        // アニメーション制御
        this.updatePlayerAnimation(newDirection, wasMoving);
    }

    /**
     * プレイヤーアニメーションを更新
     */
    private updatePlayerAnimation(newDirection: string, wasMoving: boolean): void {
        const directionChanged = newDirection !== this.currentDirection;

        if (this.isMoving) {
            // 歩行中
            if (directionChanged || !wasMoving) {
                this.currentDirection = newDirection;
                this.player.play(`player-walk-${newDirection}`, true);
            }
        } else {
            // 停止
            if (wasMoving) {
                this.player.play(`player-idle-${this.currentDirection}`, true);
            }
        }
    }

    /**
     * 衝突判定
     */
    private isCollision(gridX: number, gridY: number): boolean {
        if (gridX < 0 || gridX >= this.mapData.width ||
            gridY < 0 || gridY >= this.mapData.height) {
            return true;
        }
        return this.collisionMap[gridY]?.[gridX] ?? true;
    }

    /**
     * エンカウント判定
     */
    private checkEncounter(): void {
        if (!this.isMoving) return;

        const currentGridX = Math.floor(this.player.x / TILE_SIZE);
        const currentGridY = Math.floor(this.player.y / TILE_SIZE);

        if (currentGridX !== this.lastGridX || currentGridY !== this.lastGridY) {
            this.lastGridX = currentGridX;
            this.lastGridY = currentGridY;
            this.stepCount++;
            this.stepsSinceLastEncounter++;

            if (this.stepsSinceLastEncounter >= MIN_STEPS_BEFORE_ENCOUNTER) {
                // 草地（タイルID 2）の上にいる場合のみエンカウント
                const groundLayer = this.mapData.layers.find(l => l.name === 'ground');
                if (groundLayer) {
                    const index = currentGridY * this.mapData.width + currentGridX;
                    const tileId = groundLayer.data[index];

                    if (tileId === 2) {
                        if (Phaser.Math.Between(1, 100) <= ENCOUNTER_RATE) {
                            this.startBattle();
                        }
                    }
                }
            }
        }
    }

    /**
     * バトル開始
     */
    private startBattle(): void {
        this.input.keyboard?.removeAllKeys();
        this.stepsSinceLastEncounter = 0;

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

        const groundLayer = this.mapData.layers.find(l => l.name === 'ground');
        let tileInfo = 'Tile:-';
        if (groundLayer) {
            const index = gridY * this.mapData.width + gridX;
            const tileId = groundLayer.data[index];
            tileInfo = `Tile:${tileId}`;
        }

        this.debugText.setText([
            `Steps:${this.stepCount}`,
            `Pos:(${gridX},${gridY})`,
            tileInfo,
            `[ESC]Title [B]Battle`
        ].join('\n'));
    }
}
