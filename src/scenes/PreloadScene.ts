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

        // プレイヤースプライト用（マップ移動用：4方向×3フレーム）
        this.createPlayerTexture();

        // バトル用キャラクタースプライト（待機・攻撃・ダメージ）
        this.createBattleCharacterTexture();

        // 敵スプライトの生成（ピクセルアート）
        this.createSlimeTexture();
        this.createBatTexture();
        this.createGoblinTexture();

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
     * プレイヤースプライトシートを生成（4方向 × 3フレーム）
     * レイアウト: 3列 x 4行 = 48x96ピクセル
     * フレームサイズ: 16x24 (FF6風)
     * 行0: 下向き (frame 0-2)
     * 行1: 左向き (frame 3-5)
     * 行2: 右向き (frame 6-8)
     * 行3: 上向き (frame 9-11)
     */
    private createPlayerTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const frameWidth = 16;
        const frameHeight = 24;  // FF6風に拡大
        const framesPerDirection = 3;
        const directions = 4;

        // 色定義（より豊かな色彩）
        const colors = {
            // 体の色
            body: 0x4ade80,       // 体（緑）
            bodyLight: 0x86efac,  // 明るい緑（ハイライト）
            bodyDark: 0x166534,   // 暗い緑（影）
            bodyMid: 0x22c55e,    // 中間の緑
            // 顔のパーツ
            beak: 0xfbbf24,       // くちばし（オレンジ）
            beakDark: 0xd97706,   // くちばし（暗い）
            eye: 0x1f2937,        // 目（黒）
            eyeWhite: 0xffffff,   // 目の白
            // 足と羽
            feet: 0xf97316,       // 足（オレンジ）
            feetDark: 0xea580c,   // 足（暗い）
            wing: 0x22c55e,       // 羽（緑）
            wingDark: 0x15803d,   // 羽（暗い）
            // アクセサリ
            scarf: 0xe94560,      // スカーフ（赤）
            scarfDark: 0xbe123c,  // スカーフ（暗い）
        };

        // 各方向と各フレームを描画
        for (let dir = 0; dir < directions; dir++) {
            for (let frame = 0; frame < framesPerDirection; frame++) {
                const x = frame * frameWidth;
                const y = dir * frameHeight;
                this.drawBirdFrame16x24(graphics, x, y, dir, frame, colors);
            }
        }

        graphics.generateTexture('player', frameWidth * framesPerDirection, frameHeight * directions);
        graphics.destroy();
    }

    /**
     * バトル用キャラクタースプライトを生成
     * レイアウト: 3列 x 1行 = 48x24ピクセル
     * フレーム0: 待機ポーズ（左向き、敵を見据える）
     * フレーム1: 攻撃ポーズ（前に踏み込む）
     * フレーム2: ダメージポーズ（後ろに仰け反る）
     */
    private createBattleCharacterTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const frameWidth = 16;
        const frameHeight = 24;
        const frames = 3;  // 待機、攻撃、ダメージ

        // 色定義
        const colors = {
            body: 0x4ade80,
            bodyLight: 0x86efac,
            bodyDark: 0x166534,
            bodyMid: 0x22c55e,
            beak: 0xfbbf24,
            beakDark: 0xd97706,
            eye: 0x1f2937,
            eyeWhite: 0xffffff,
            feet: 0xf97316,
            feetDark: 0xea580c,
            wing: 0x22c55e,
            wingDark: 0x15803d,
            scarf: 0xe94560,
            scarfDark: 0xbe123c,
        };

        // フレーム0: 待機ポーズ（左向き、構えている）
        this.drawBattleIdlePose(graphics, 0, 0, colors);

        // フレーム1: 攻撃ポーズ（前に突き出す）
        this.drawBattleAttackPose(graphics, frameWidth, 0, colors);

        // フレーム2: ダメージポーズ（後ろに仰け反る）
        this.drawBattleDamagePose(graphics, frameWidth * 2, 0, colors);

        graphics.generateTexture('player-battle', frameWidth * frames, frameHeight);
        graphics.destroy();

        // フレームを追加
        this.textures.get('player-battle').add(0, 0, 0, 0, frameWidth, frameHeight);
        this.textures.get('player-battle').add(1, 0, frameWidth, 0, frameWidth, frameHeight);
        this.textures.get('player-battle').add(2, 0, frameWidth * 2, 0, frameWidth, frameHeight);
    }

    /**
     * バトル待機ポーズを描画（左向き、敵を見据える）
     */
    private drawBattleIdlePose(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        colors: { [key: string]: number }
    ): void {
        // 足
        graphics.fillStyle(colors.feetDark, 1);
        graphics.fillRect(x + 4, y + 19, 3, 4);
        graphics.fillRect(x + 9, y + 19, 3, 4);
        graphics.fillStyle(colors.feet, 1);
        graphics.fillRect(x + 4, y + 18, 3, 4);
        graphics.fillRect(x + 9, y + 18, 3, 4);

        // 体
        graphics.fillStyle(colors.bodyDark, 1);
        graphics.fillRoundedRect(x + 3, y + 8, 10, 10, 3);
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 3, y + 7, 10, 9, 3);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 5, y + 8, 5, 4);

        // スカーフ
        graphics.fillStyle(colors.scarf, 1);
        graphics.fillRect(x + 5, y + 13, 6, 2);
        graphics.fillStyle(colors.scarfDark, 1);
        graphics.fillRect(x + 10, y + 14, 3, 2);

        // 頭
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 4, y + 2, 8, 7, 2);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 5, y + 3, 4, 3);

        // 目（左を向いているので左側に）
        graphics.fillStyle(colors.eyeWhite, 1);
        graphics.fillRect(x + 4, y + 4, 3, 3);
        graphics.fillStyle(colors.eye, 1);
        graphics.fillRect(x + 4, y + 5, 2, 2);

        // くちばし（左向き）
        graphics.fillStyle(colors.beak, 1);
        graphics.fillRect(x + 1, y + 6, 4, 2);
        graphics.fillStyle(colors.beakDark, 1);
        graphics.fillRect(x + 1, y + 7, 4, 1);

        // 羽（体の横、構え）
        graphics.fillStyle(colors.wing, 1);
        graphics.fillRect(x + 11, y + 8, 3, 5);
        graphics.fillStyle(colors.wingDark, 1);
        graphics.fillRect(x + 12, y + 11, 2, 2);
    }

    /**
     * バトル攻撃ポーズを描画（前に踏み込む、羽を前に突き出す）
     */
    private drawBattleAttackPose(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        colors: { [key: string]: number }
    ): void {
        // 足（前に踏み込み）
        graphics.fillStyle(colors.feetDark, 1);
        graphics.fillRect(x + 2, y + 19, 3, 4);
        graphics.fillRect(x + 7, y + 18, 3, 5);
        graphics.fillStyle(colors.feet, 1);
        graphics.fillRect(x + 2, y + 18, 3, 4);
        graphics.fillRect(x + 7, y + 17, 3, 5);

        // 体（前傾）
        graphics.fillStyle(colors.bodyDark, 1);
        graphics.fillRoundedRect(x + 1, y + 7, 10, 10, 3);
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 1, y + 6, 10, 9, 3);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 3, y + 7, 5, 4);

        // スカーフ（後ろにたなびく）
        graphics.fillStyle(colors.scarf, 1);
        graphics.fillRect(x + 3, y + 12, 6, 2);
        graphics.fillStyle(colors.scarfDark, 1);
        graphics.fillRect(x + 8, y + 11, 4, 3);
        graphics.fillRect(x + 11, y + 10, 3, 2);

        // 頭（前傾、やや下を向く）
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 2, y + 2, 8, 7, 2);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 3, y + 3, 4, 3);

        // 目（気合の入った目）
        graphics.fillStyle(colors.eyeWhite, 1);
        graphics.fillRect(x + 2, y + 4, 3, 3);
        graphics.fillStyle(colors.eye, 1);
        graphics.fillRect(x + 2, y + 5, 2, 2);

        // くちばし（開いている、気合）
        graphics.fillStyle(colors.beak, 1);
        graphics.fillRect(x - 1, y + 5, 4, 2);
        graphics.fillRect(x - 1, y + 7, 3, 1);
        graphics.fillStyle(colors.beakDark, 1);
        graphics.fillRect(x - 1, y + 6, 4, 1);

        // 羽（前に突き出す攻撃モーション）
        graphics.fillStyle(colors.wing, 1);
        graphics.fillRect(x - 2, y + 7, 5, 4);
        graphics.fillStyle(colors.wingDark, 1);
        graphics.fillRect(x - 2, y + 9, 2, 2);
    }

    /**
     * バトルダメージポーズを描画（後ろに仰け反る）
     */
    private drawBattleDamagePose(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        colors: { [key: string]: number }
    ): void {
        // 足（後ろに体重）
        graphics.fillStyle(colors.feetDark, 1);
        graphics.fillRect(x + 6, y + 19, 3, 4);
        graphics.fillRect(x + 11, y + 19, 3, 4);
        graphics.fillStyle(colors.feet, 1);
        graphics.fillRect(x + 6, y + 18, 3, 4);
        graphics.fillRect(x + 11, y + 18, 3, 4);

        // 体（後傾）
        graphics.fillStyle(colors.bodyDark, 1);
        graphics.fillRoundedRect(x + 5, y + 8, 10, 10, 3);
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 5, y + 7, 10, 9, 3);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 7, y + 8, 5, 4);

        // スカーフ（衝撃で前に）
        graphics.fillStyle(colors.scarf, 1);
        graphics.fillRect(x + 7, y + 13, 6, 2);
        graphics.fillStyle(colors.scarfDark, 1);
        graphics.fillRect(x + 4, y + 12, 4, 3);

        // 頭（後ろに仰け反る）
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 6, y + 1, 8, 7, 2);
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 7, y + 2, 4, 3);

        // 目（ダメージで閉じる/驚く）
        graphics.fillStyle(colors.eye, 1);
        graphics.fillRect(x + 6, y + 4, 3, 1);
        graphics.fillRect(x + 7, y + 3, 1, 3);

        // くちばし
        graphics.fillStyle(colors.beak, 1);
        graphics.fillRect(x + 3, y + 5, 4, 2);
        graphics.fillStyle(colors.beakDark, 1);
        graphics.fillRect(x + 3, y + 6, 4, 1);

        // 羽（広がる）
        graphics.fillStyle(colors.wing, 1);
        graphics.fillRect(x + 13, y + 6, 3, 6);
        graphics.fillStyle(colors.wingDark, 1);
        graphics.fillRect(x + 14, y + 10, 2, 2);
    }

    /**
     * FF6風の鳥キャラクター（16x24）の1フレームを描画
     * @param graphics Graphicsオブジェクト
     * @param x フレームのX座標
     * @param y フレームのY座標
     * @param direction 方向 (0:下, 1:左, 2:右, 3:上)
     * @param frame フレーム番号 (0-2: 歩行サイクル)
     * @param colors 色定義
     */
    private drawBirdFrame16x24(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        direction: number,
        frame: number,
        colors: { [key: string]: number }
    ): void {
        // 歩行アニメーションのオフセット
        const bounceOffset = frame === 1 ? -1 : 0; // 中間フレームで少し上に

        // 足の動きパターン
        const isLeftFootForward = frame === 0;
        const isRightFootForward = frame === 2;
        const isBothFeet = frame === 1;

        // === 足を先に描画（体の下に隠れる部分） ===
        this.drawBirdFeet(graphics, x, y, direction, frame, colors);

        // === 体（メインボディ） ===
        const bodyY = y + 6 + bounceOffset;

        // 体の影
        graphics.fillStyle(colors.bodyDark, 1);
        graphics.fillRoundedRect(x + 3, bodyY + 2, 10, 10, 3);

        // 体のメイン
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 3, bodyY + 1, 10, 9, 3);

        // 体のハイライト
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 5, bodyY + 2, 5, 4);

        // === スカーフ（首元のアクセサリー） ===
        graphics.fillStyle(colors.scarf, 1);
        if (direction === 0) { // 下向き
            graphics.fillRect(x + 4, bodyY + 8, 8, 2);
            graphics.fillStyle(colors.scarfDark, 1);
            graphics.fillRect(x + 6, bodyY + 9, 4, 3); // たなびく部分
        } else if (direction === 1) { // 左向き
            graphics.fillRect(x + 5, bodyY + 7, 6, 2);
            graphics.fillStyle(colors.scarfDark, 1);
            graphics.fillRect(x + 10, bodyY + 8, 3, 2); // 右側にたなびく
        } else if (direction === 2) { // 右向き
            graphics.fillRect(x + 5, bodyY + 7, 6, 2);
            graphics.fillStyle(colors.scarfDark, 1);
            graphics.fillRect(x + 3, bodyY + 8, 3, 2); // 左側にたなびく
        } else { // 上向き
            graphics.fillRect(x + 4, bodyY + 8, 8, 2);
        }

        // === 頭 ===
        const headY = y + 2 + bounceOffset;

        // 頭のベース
        graphics.fillStyle(colors.body, 1);
        graphics.fillRoundedRect(x + 4, headY, 8, 7, 2);

        // 頭のハイライト
        graphics.fillStyle(colors.bodyLight, 1);
        graphics.fillRect(x + 5, headY + 1, 4, 3);

        // === 顔のパーツ（方向別） ===
        switch (direction) {
            case 0: // 下向き
                // 目（2つ）- 白目付き
                graphics.fillStyle(colors.eyeWhite, 1);
                graphics.fillRect(x + 5, headY + 2, 3, 3);
                graphics.fillRect(x + 9, headY + 2, 3, 3);
                graphics.fillStyle(colors.eye, 1);
                graphics.fillRect(x + 6, headY + 3, 2, 2);
                graphics.fillRect(x + 10, headY + 3, 2, 2);
                // くちばし
                graphics.fillStyle(colors.beak, 1);
                graphics.fillRect(x + 7, headY + 5, 3, 2);
                graphics.fillStyle(colors.beakDark, 1);
                graphics.fillRect(x + 7, headY + 6, 3, 1);
                break;

            case 1: // 左向き
                // 目（1つ、左側）
                graphics.fillStyle(colors.eyeWhite, 1);
                graphics.fillRect(x + 4, headY + 2, 3, 3);
                graphics.fillStyle(colors.eye, 1);
                graphics.fillRect(x + 4, headY + 3, 2, 2);
                // くちばし（横長）
                graphics.fillStyle(colors.beak, 1);
                graphics.fillRect(x + 1, headY + 4, 4, 2);
                graphics.fillStyle(colors.beakDark, 1);
                graphics.fillRect(x + 1, headY + 5, 4, 1);
                // 羽（体の横）
                graphics.fillStyle(colors.wing, 1);
                graphics.fillRect(x + 11, bodyY + 2, 3, 5);
                graphics.fillStyle(colors.wingDark, 1);
                graphics.fillRect(x + 12, bodyY + 5, 2, 2);
                break;

            case 2: // 右向き
                // 目（1つ、右側）
                graphics.fillStyle(colors.eyeWhite, 1);
                graphics.fillRect(x + 10, headY + 2, 3, 3);
                graphics.fillStyle(colors.eye, 1);
                graphics.fillRect(x + 11, headY + 3, 2, 2);
                // くちばし（横長）
                graphics.fillStyle(colors.beak, 1);
                graphics.fillRect(x + 12, headY + 4, 4, 2);
                graphics.fillStyle(colors.beakDark, 1);
                graphics.fillRect(x + 12, headY + 5, 4, 1);
                // 羽（体の横）
                graphics.fillStyle(colors.wing, 1);
                graphics.fillRect(x + 2, bodyY + 2, 3, 5);
                graphics.fillStyle(colors.wingDark, 1);
                graphics.fillRect(x + 2, bodyY + 5, 2, 2);
                break;

            case 3: // 上向き
                // 後頭部のハイライト
                graphics.fillStyle(colors.bodyMid, 1);
                graphics.fillRect(x + 5, headY + 1, 6, 4);
                // とさか
                graphics.fillStyle(colors.scarf, 1);
                graphics.fillRect(x + 7, headY - 1, 2, 2);
                // しっぽ
                graphics.fillStyle(colors.wing, 1);
                graphics.fillRect(x + 6, bodyY + 8, 4, 3);
                graphics.fillStyle(colors.wingDark, 1);
                graphics.fillRect(x + 7, bodyY + 10, 2, 2);
                break;
        }
    }

    /**
     * 鳥の足を描画
     */
    private drawBirdFeet(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        direction: number,
        frame: number,
        colors: { [key: string]: number }
    ): void {
        const feetY = y + 18; // 足のベース位置

        // 足のアニメーションオフセット
        let leftFootX = x + 4;
        let rightFootX = x + 9;
        let leftFootY = feetY;
        let rightFootY = feetY;

        // 歩行フレームによる足の位置調整
        if (direction === 0 || direction === 3) { // 上下向き
            if (frame === 0) {
                leftFootY = feetY - 1;
                rightFootY = feetY + 1;
            } else if (frame === 2) {
                leftFootY = feetY + 1;
                rightFootY = feetY - 1;
            }
        } else if (direction === 1) { // 左向き
            if (frame === 0) {
                leftFootX = x + 3;
                rightFootX = x + 8;
            } else if (frame === 2) {
                leftFootX = x + 5;
                rightFootX = x + 10;
            }
        } else if (direction === 2) { // 右向き
            if (frame === 0) {
                leftFootX = x + 5;
                rightFootX = x + 10;
            } else if (frame === 2) {
                leftFootX = x + 3;
                rightFootX = x + 8;
            }
        }

        // 足の影
        graphics.fillStyle(colors.feetDark, 1);
        graphics.fillRect(leftFootX, leftFootY + 1, 3, 4);
        graphics.fillRect(rightFootX, rightFootY + 1, 3, 4);

        // 足のメイン
        graphics.fillStyle(colors.feet, 1);
        graphics.fillRect(leftFootX, leftFootY, 3, 4);
        graphics.fillRect(rightFootX, rightFootY, 3, 4);

        // 足先（爪）
        graphics.fillRect(leftFootX - 1, leftFootY + 3, 1, 2);
        graphics.fillRect(leftFootX + 3, leftFootY + 3, 1, 2);
        graphics.fillRect(rightFootX - 1, rightFootY + 3, 1, 2);
        graphics.fillRect(rightFootX + 3, rightFootY + 3, 1, 2);
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

    /**
     * スライムスプライトを生成 (32x32, 2フレーム)
     * ドロップ型のかわいいスライム
     */
    private createSlimeTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const frameWidth = 32;
        const frameHeight = 32;
        const frames = 2;

        // 色定義
        const colors = {
            body: 0xe94560,       // 本体（ピンク/赤）
            bodyLight: 0xff6b8a,  // ハイライト
            bodyDark: 0xbe123c,   // シャドウ
            eye: 0x1f2937,        // 目
            eyeWhite: 0xffffff,   // 目の白
            highlight: 0xffffff,  // てかり
        };

        for (let frame = 0; frame < frames; frame++) {
            const x = frame * frameWidth;
            const y = 0;

            // アニメーションオフセット（伸び縮み）
            const squash = frame === 0 ? 0 : 2;
            const stretch = frame === 0 ? 0 : -2;

            // 影
            graphics.fillStyle(0x000000, 0.3);
            graphics.fillEllipse(x + 16, y + 30, 20, 6);

            // 本体（ドロップ型）
            graphics.fillStyle(colors.bodyDark, 1);
            graphics.fillEllipse(x + 16, y + 20 - stretch, 14 + squash, 12 + stretch);

            graphics.fillStyle(colors.body, 1);
            graphics.fillEllipse(x + 16, y + 18 - stretch, 12 + squash, 10 + stretch);

            // 頭のとんがり部分
            graphics.fillStyle(colors.body, 1);
            graphics.fillTriangle(
                x + 16, y + 4 - stretch,
                x + 10, y + 14 - stretch,
                x + 22, y + 14 - stretch
            );

            // ハイライト
            graphics.fillStyle(colors.bodyLight, 1);
            graphics.fillEllipse(x + 12, y + 14 - stretch, 4, 6);

            // てかり
            graphics.fillStyle(colors.highlight, 0.8);
            graphics.fillCircle(x + 10, y + 12 - stretch, 2);

            // 目（2つ）
            graphics.fillStyle(colors.eyeWhite, 1);
            graphics.fillCircle(x + 12, y + 18 - stretch, 4);
            graphics.fillCircle(x + 20, y + 18 - stretch, 4);

            graphics.fillStyle(colors.eye, 1);
            graphics.fillCircle(x + 13, y + 19 - stretch, 2);
            graphics.fillCircle(x + 21, y + 19 - stretch, 2);

            // ハイライト（目）
            graphics.fillStyle(colors.highlight, 1);
            graphics.fillCircle(x + 12, y + 17 - stretch, 1);
            graphics.fillCircle(x + 20, y + 17 - stretch, 1);

            // 口（にっこり）
            graphics.lineStyle(1, colors.eye, 1);
            graphics.beginPath();
            graphics.arc(x + 16, y + 22 - stretch, 3, 0.2, Math.PI - 0.2);
            graphics.strokePath();
        }

        graphics.generateTexture('enemy-slime', frameWidth * frames, frameHeight);
        graphics.destroy();

        // スプライトシートとしてフレームを追加
        this.textures.get('enemy-slime').add(0, 0, 0, 0, frameWidth, frameHeight);
        this.textures.get('enemy-slime').add(1, 0, frameWidth, 0, frameWidth, frameHeight);
    }

    /**
     * コウモリスプライトを生成 (32x32, 2フレーム)
     * 翼を広げたコウモリ
     */
    private createBatTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const frameWidth = 32;
        const frameHeight = 32;
        const frames = 2;

        // 色定義
        const colors = {
            body: 0x8b5cf6,       // 本体（紫）
            bodyLight: 0xa78bfa,  // ハイライト
            bodyDark: 0x6d28d9,   // シャドウ
            wing: 0x7c3aed,       // 翼
            wingDark: 0x5b21b6,   // 翼（暗い）
            eye: 0xff0000,        // 目（赤）
            eyeGlow: 0xff6666,    // 目の光
            ear: 0x6d28d9,        // 耳
        };

        for (let frame = 0; frame < frames; frame++) {
            const x = frame * frameWidth;
            const y = 0;

            // 翼の角度（羽ばたき）
            const wingUp = frame === 0;
            const wingY = wingUp ? -3 : 3;

            // 左翼
            graphics.fillStyle(colors.wingDark, 1);
            graphics.fillTriangle(
                x + 8, y + 16,
                x + 1, y + 10 + wingY,
                x + 1, y + 22 + wingY
            );
            graphics.fillStyle(colors.wing, 1);
            graphics.fillTriangle(
                x + 10, y + 16,
                x + 2, y + 11 + wingY,
                x + 2, y + 21 + wingY
            );
            // 翼の骨
            graphics.lineStyle(1, colors.bodyDark, 1);
            graphics.lineBetween(x + 8, y + 14, x + 2, y + 10 + wingY);
            graphics.lineBetween(x + 8, y + 16, x + 2, y + 16 + wingY);
            graphics.lineBetween(x + 8, y + 18, x + 2, y + 22 + wingY);

            // 右翼
            graphics.fillStyle(colors.wingDark, 1);
            graphics.fillTriangle(
                x + 24, y + 16,
                x + 31, y + 10 + wingY,
                x + 31, y + 22 + wingY
            );
            graphics.fillStyle(colors.wing, 1);
            graphics.fillTriangle(
                x + 22, y + 16,
                x + 30, y + 11 + wingY,
                x + 30, y + 21 + wingY
            );
            // 翼の骨
            graphics.lineStyle(1, colors.bodyDark, 1);
            graphics.lineBetween(x + 24, y + 14, x + 30, y + 10 + wingY);
            graphics.lineBetween(x + 24, y + 16, x + 30, y + 16 + wingY);
            graphics.lineBetween(x + 24, y + 18, x + 30, y + 22 + wingY);

            // 本体
            graphics.fillStyle(colors.bodyDark, 1);
            graphics.fillEllipse(x + 16, y + 18, 10, 8);
            graphics.fillStyle(colors.body, 1);
            graphics.fillEllipse(x + 16, y + 17, 9, 7);

            // 頭
            graphics.fillStyle(colors.body, 1);
            graphics.fillCircle(x + 16, y + 12, 6);

            // ハイライト
            graphics.fillStyle(colors.bodyLight, 1);
            graphics.fillCircle(x + 14, y + 10, 2);

            // 耳（2つ、三角形）
            graphics.fillStyle(colors.ear, 1);
            graphics.fillTriangle(x + 10, y + 8, x + 12, y + 3, x + 14, y + 8);
            graphics.fillTriangle(x + 18, y + 8, x + 20, y + 3, x + 22, y + 8);

            // 目（赤く光る）
            graphics.fillStyle(colors.eyeGlow, 1);
            graphics.fillCircle(x + 13, y + 12, 2);
            graphics.fillCircle(x + 19, y + 12, 2);
            graphics.fillStyle(colors.eye, 1);
            graphics.fillCircle(x + 13, y + 12, 1);
            graphics.fillCircle(x + 19, y + 12, 1);

            // 牙
            graphics.fillStyle(0xffffff, 1);
            graphics.fillTriangle(x + 14, y + 16, x + 15, y + 19, x + 16, y + 16);
            graphics.fillTriangle(x + 16, y + 16, x + 17, y + 19, x + 18, y + 16);

            // 足（小さい）
            graphics.fillStyle(colors.bodyDark, 1);
            graphics.fillRect(x + 13, y + 24, 2, 4);
            graphics.fillRect(x + 17, y + 24, 2, 4);
        }

        graphics.generateTexture('enemy-bat', frameWidth * frames, frameHeight);
        graphics.destroy();

        // スプライトシートとしてフレームを追加
        this.textures.get('enemy-bat').add(0, 0, 0, 0, frameWidth, frameHeight);
        this.textures.get('enemy-bat').add(1, 0, frameWidth, 0, frameWidth, frameHeight);
    }

    /**
     * ゴブリンスプライトを生成 (32x32, 2フレーム)
     * 小鬼風のモンスター
     */
    private createGoblinTexture(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });
        const frameWidth = 32;
        const frameHeight = 32;
        const frames = 2;

        // 色定義
        const colors = {
            skin: 0x22c55e,       // 肌（緑）
            skinLight: 0x4ade80,  // ハイライト
            skinDark: 0x166534,   // シャドウ
            eye: 0xfbbf24,        // 目（黄色）
            eyePupil: 0x1f2937,   // 瞳
            ear: 0x15803d,        // 耳
            cloth: 0x78350f,      // 服（茶色）
            clothDark: 0x451a03,  // 服（暗い）
            weapon: 0x6b7280,     // 武器（灰色）
            weaponLight: 0x9ca3af, // 武器（明るい）
        };

        for (let frame = 0; frame < frames; frame++) {
            const x = frame * frameWidth;
            const y = 0;

            // アニメーションオフセット
            const bounce = frame === 0 ? 0 : 1;
            const armSwing = frame === 0 ? 0 : 2;

            // 影
            graphics.fillStyle(0x000000, 0.3);
            graphics.fillEllipse(x + 16, y + 30, 12, 4);

            // 足
            graphics.fillStyle(colors.skinDark, 1);
            graphics.fillRect(x + 10, y + 24 + bounce, 4, 6);
            graphics.fillRect(x + 18, y + 24 + bounce, 4, 6);
            graphics.fillStyle(colors.skin, 1);
            graphics.fillRect(x + 10, y + 24 + bounce, 4, 5);
            graphics.fillRect(x + 18, y + 24 + bounce, 4, 5);

            // 体（ぼろ布）
            graphics.fillStyle(colors.clothDark, 1);
            graphics.fillRect(x + 8, y + 14 + bounce, 16, 12);
            graphics.fillStyle(colors.cloth, 1);
            graphics.fillRect(x + 9, y + 14 + bounce, 14, 10);
            // ぼろぼろの端
            graphics.fillTriangle(x + 8, y + 24 + bounce, x + 10, y + 24 + bounce, x + 9, y + 27 + bounce);
            graphics.fillTriangle(x + 14, y + 24 + bounce, x + 16, y + 24 + bounce, x + 15, y + 26 + bounce);
            graphics.fillTriangle(x + 22, y + 24 + bounce, x + 24, y + 24 + bounce, x + 23, y + 27 + bounce);

            // 腕
            graphics.fillStyle(colors.skinDark, 1);
            graphics.fillRect(x + 4, y + 16 + bounce - armSwing, 5, 8);
            graphics.fillRect(x + 23, y + 16 + bounce + armSwing, 5, 8);
            graphics.fillStyle(colors.skin, 1);
            graphics.fillRect(x + 5, y + 16 + bounce - armSwing, 4, 7);
            graphics.fillRect(x + 23, y + 16 + bounce + armSwing, 4, 7);

            // 武器（こん棒）
            graphics.fillStyle(colors.weapon, 1);
            graphics.fillRect(x + 26, y + 12 + bounce + armSwing, 4, 14);
            graphics.fillStyle(colors.weaponLight, 1);
            graphics.fillRect(x + 27, y + 12 + bounce + armSwing, 2, 3);
            // こん棒の先端
            graphics.fillStyle(colors.weapon, 1);
            graphics.fillCircle(x + 28, y + 10 + bounce + armSwing, 4);
            graphics.fillStyle(colors.weaponLight, 1);
            graphics.fillCircle(x + 27, y + 9 + bounce + armSwing, 1);

            // 頭
            graphics.fillStyle(colors.skinDark, 1);
            graphics.fillCircle(x + 16, y + 10 + bounce, 8);
            graphics.fillStyle(colors.skin, 1);
            graphics.fillCircle(x + 16, y + 9 + bounce, 7);
            graphics.fillStyle(colors.skinLight, 1);
            graphics.fillCircle(x + 14, y + 7 + bounce, 2);

            // 耳（大きく尖った）
            graphics.fillStyle(colors.ear, 1);
            graphics.fillTriangle(x + 6, y + 10 + bounce, x + 10, y + 4 + bounce, x + 12, y + 10 + bounce);
            graphics.fillTriangle(x + 20, y + 10 + bounce, x + 22, y + 4 + bounce, x + 26, y + 10 + bounce);
            graphics.fillStyle(colors.skinLight, 1);
            graphics.fillTriangle(x + 8, y + 10 + bounce, x + 10, y + 6 + bounce, x + 11, y + 10 + bounce);
            graphics.fillTriangle(x + 21, y + 10 + bounce, x + 22, y + 6 + bounce, x + 24, y + 10 + bounce);

            // 目（大きく黄色い）
            graphics.fillStyle(colors.eye, 1);
            graphics.fillCircle(x + 13, y + 9 + bounce, 3);
            graphics.fillCircle(x + 19, y + 9 + bounce, 3);
            graphics.fillStyle(colors.eyePupil, 1);
            graphics.fillCircle(x + 14, y + 10 + bounce, 1);
            graphics.fillCircle(x + 20, y + 10 + bounce, 1);

            // 鼻（丸い）
            graphics.fillStyle(colors.skinDark, 1);
            graphics.fillCircle(x + 16, y + 12 + bounce, 2);

            // 口（にやり）
            graphics.lineStyle(1, colors.skinDark, 1);
            graphics.beginPath();
            graphics.arc(x + 16, y + 14 + bounce, 3, 0.3, Math.PI - 0.3);
            graphics.strokePath();

            // 牙
            graphics.fillStyle(0xffffff, 1);
            graphics.fillTriangle(x + 13, y + 15 + bounce, x + 14, y + 18 + bounce, x + 15, y + 15 + bounce);
            graphics.fillTriangle(x + 17, y + 15 + bounce, x + 18, y + 18 + bounce, x + 19, y + 15 + bounce);
        }

        graphics.generateTexture('enemy-goblin', frameWidth * frames, frameHeight);
        graphics.destroy();

        // スプライトシートとしてフレームを追加
        this.textures.get('enemy-goblin').add(0, 0, 0, 0, frameWidth, frameHeight);
        this.textures.get('enemy-goblin').add(1, 0, frameWidth, 0, frameWidth, frameHeight);
    }

    create(): void {
        console.log('PreloadScene: Assets loaded');

        // プレイヤーアニメーションを定義
        this.createPlayerAnimations();

        // バトル用キャラクターアニメーションを定義
        this.createBattleCharacterAnimations();

        // 敵アニメーションを定義
        this.createEnemyAnimations();

        // タイトルシーンへ遷移
        this.scene.start('TitleScene');
    }

    /**
     * プレイヤーアニメーションを定義
     */
    private createPlayerAnimations(): void {
        const frameRate = 8;
        const frameWidth = 16;
        const frameHeight = 16;

        // 下向き歩行 (行0: フレーム0-2)
        this.anims.create({
            key: 'player-walk-down',
            frames: this.anims.generateFrameNumbers('player', {
                start: 0,
                end: 2
            }),
            frameRate: frameRate,
            repeat: -1
        });

        // 左向き歩行 (行1: フレーム3-5)
        this.anims.create({
            key: 'player-walk-left',
            frames: this.anims.generateFrameNumbers('player', {
                start: 3,
                end: 5
            }),
            frameRate: frameRate,
            repeat: -1
        });

        // 右向き歩行 (行2: フレーム6-8)
        this.anims.create({
            key: 'player-walk-right',
            frames: this.anims.generateFrameNumbers('player', {
                start: 6,
                end: 8
            }),
            frameRate: frameRate,
            repeat: -1
        });

        // 上向き歩行 (行3: フレーム9-11)
        this.anims.create({
            key: 'player-walk-up',
            frames: this.anims.generateFrameNumbers('player', {
                start: 9,
                end: 11
            }),
            frameRate: frameRate,
            repeat: -1
        });

        // 待機アニメーション（各方向の最初のフレーム）
        this.anims.create({
            key: 'player-idle-down',
            frames: [{ key: 'player', frame: 0 }],
            frameRate: 1
        });
        this.anims.create({
            key: 'player-idle-left',
            frames: [{ key: 'player', frame: 3 }],
            frameRate: 1
        });
        this.anims.create({
            key: 'player-idle-right',
            frames: [{ key: 'player', frame: 6 }],
            frameRate: 1
        });
        this.anims.create({
            key: 'player-idle-up',
            frames: [{ key: 'player', frame: 9 }],
            frameRate: 1
        });

        console.log('Player animations created');
    }

    /**
     * バトル用キャラクターアニメーションを定義
     */
    private createBattleCharacterAnimations(): void {
        // バトル待機（左向き）
        this.anims.create({
            key: 'battle-idle',
            frames: [{ key: 'player-battle', frame: 0 }],
            frameRate: 1
        });

        // バトル攻撃（前に踏み込む）
        this.anims.create({
            key: 'battle-attack',
            frames: [{ key: 'player-battle', frame: 1 }],
            frameRate: 1
        });

        // バトルダメージ（後ろに仰け反る）
        this.anims.create({
            key: 'battle-damage',
            frames: [{ key: 'player-battle', frame: 2 }],
            frameRate: 1
        });

        console.log('Battle character animations created');
    }

    /**
     * 敵アニメーションを定義
     */
    private createEnemyAnimations(): void {
        // スライムのアイドルアニメーション（伸び縮み）
        this.anims.create({
            key: 'enemy-slime-idle',
            frames: this.anims.generateFrameNumbers('enemy-slime', {
                start: 0,
                end: 1
            }),
            frameRate: 2,
            repeat: -1
        });

        // コウモリのアイドルアニメーション（羽ばたき）
        this.anims.create({
            key: 'enemy-bat-idle',
            frames: this.anims.generateFrameNumbers('enemy-bat', {
                start: 0,
                end: 1
            }),
            frameRate: 6,
            repeat: -1
        });

        // ゴブリンのアイドルアニメーション（足踏み）
        this.anims.create({
            key: 'enemy-goblin-idle',
            frames: this.anims.generateFrameNumbers('enemy-goblin', {
                start: 0,
                end: 1
            }),
            frameRate: 3,
            repeat: -1
        });

        console.log('Enemy animations created');
    }
}
