/**
 * BattleScene - バトル画面
 * オクトパストラベラー風のターン制バトル（MVP版）
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';

/** バトルコマンド */
type BattleCommand = 'attack' | 'defend' | 'escape';

/** バトルステート */
type BattleState = 'start' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat' | 'escaped';

/** 敵データ */
interface EnemyData {
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    color: number;
    width: number;
    height: number;
    spriteKey: string;  // スプライトのテクスチャキー
}

/** 敵データベース */
const ENEMY_DATABASE: Record<string, EnemyData> = {
    slime: {
        name: 'スライム',
        hp: 30,
        maxHp: 30,
        attack: 5,
        defense: 2,
        color: 0xe94560,
        width: 32,
        height: 32,
        spriteKey: 'enemy-slime'
    },
    bat: {
        name: 'コウモリ',
        hp: 20,
        maxHp: 20,
        attack: 8,
        defense: 1,
        color: 0x8b5cf6,
        width: 32,
        height: 32,
        spriteKey: 'enemy-bat'
    },
    goblin: {
        name: 'ゴブリン',
        hp: 40,
        maxHp: 40,
        attack: 10,
        defense: 3,
        color: 0xf59e0b,
        width: 32,
        height: 32,
        spriteKey: 'enemy-goblin'
    }
};

export class BattleScene extends Phaser.Scene {
    private enemy!: EnemyData;
    private enemyType: string = 'slime';  // 現在の敵タイプ
    private enemySprite!: Phaser.GameObjects.Sprite;
    private returnScene: string = 'MapScene';
    private playerPosition: { x: number; y: number } = { x: 0, y: 0 };

    // パーティスプライト（FF6風：右側に斜め配置、最大4人）
    private partySprites: Phaser.GameObjects.Sprite[] = [];
    private partyCount: number = 1;  // 現在のパーティ人数（将来的に増加）

    // プレイヤーステータス
    private playerHp: number = 100;
    private playerMaxHp: number = 100;
    private playerAttack: number = 15;
    private playerDefense: number = 5;

    // バトル状態
    private battleState: BattleState = 'start';
    private selectedCommand: number = 0;
    private commands: BattleCommand[] = ['attack', 'defend', 'escape'];

    // UI要素
    private commandTexts: Phaser.GameObjects.Text[] = [];
    private messageText!: Phaser.GameObjects.Text;
    private playerHpText!: Phaser.GameObjects.Text;
    private enemyHpText!: Phaser.GameObjects.Text;
    private cursor!: Phaser.GameObjects.Text;
    private isDefending: boolean = false;

    // HPバー
    private playerHpBar!: Phaser.GameObjects.Graphics;
    private enemyHpBar!: Phaser.GameObjects.Graphics;
    private playerHpBarBg!: Phaser.GameObjects.Graphics;
    private enemyHpBarBg!: Phaser.GameObjects.Graphics;

    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data: { enemyType?: string; returnScene?: string; playerPosition?: { x: number; y: number } }): void {
        this.enemyType = data.enemyType || 'slime';
        this.enemy = { ...ENEMY_DATABASE[this.enemyType] };
        this.returnScene = data.returnScene || 'MapScene';
        this.playerPosition = data.playerPosition || { x: 0, y: 0 };

        // ステータスリセット
        this.battleState = 'start';
        this.selectedCommand = 0;
        this.isDefending = false;
    }

    create(): void {
        console.log('BattleScene: Creating...');

        this.createBackground();
        this.createEnemySprite();
        this.createPartySprites();  // FF6風：パーティを右側に配置
        this.createUI();
        this.setupInput();

        // フェードイン後にバトル開始
        this.cameras.main.fadeIn(300);

        this.time.delayedCall(500, () => {
            this.showMessage(`${this.enemy.name}があらわれた！`);
            this.time.delayedCall(1500, () => {
                this.startPlayerTurn();
            });
        });
    }

    /**
     * 背景を作成
     */
    private createBackground(): void {
        // バトル背景（グラデーション）
        const bg = this.add.graphics();

        // 空
        bg.fillStyle(0x1e3a5f, 1);
        bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.6);

        // 地面
        bg.fillStyle(0x2d4a3e, 1);
        bg.fillRect(0, GAME_HEIGHT * 0.6, GAME_WIDTH, GAME_HEIGHT * 0.4);

        // 地面のライン
        bg.lineStyle(2, 0x3d5a4e, 1);
        bg.lineBetween(0, GAME_HEIGHT * 0.6, GAME_WIDTH, GAME_HEIGHT * 0.6);
    }

    /**
     * 敵スプライトを作成（FF6風：左側に配置）
     */
    private createEnemySprite(): void {
        // FF6風：敵は画面左側に配置
        const enemyX = GAME_WIDTH * 0.25;
        const enemyY = GAME_HEIGHT * 0.4;

        // スプライトを作成
        this.enemySprite = this.add.sprite(
            enemyX,
            enemyY,
            this.enemy.spriteKey
        );

        // スプライトのスケール（必要に応じて調整）
        this.enemySprite.setScale(2);

        // アイドルアニメーションを再生
        const animKey = `${this.enemy.spriteKey}-idle`;
        if (this.anims.exists(animKey)) {
            this.enemySprite.play(animKey);
        }

        // 軽い浮遊アニメーション（コウモリはより大きく）
        const floatAmount = this.enemyType === 'bat' ? 8 : 3;
        this.tweens.add({
            targets: this.enemySprite,
            y: this.enemySprite.y - floatAmount,
            duration: this.enemyType === 'bat' ? 600 : 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * パーティスプライトを作成（FF6風：右側に斜め配置）
     * 奥から手前に並ぶ（上から下へ、右から左へ）
     */
    private createPartySprites(): void {
        // パーティスプライトをクリア
        this.partySprites.forEach(sprite => sprite.destroy());
        this.partySprites = [];

        // パーティメンバーの配置（最大4人）
        // FF6風：右上から左下に斜めに並ぶ
        const baseX = GAME_WIDTH * 0.75;  // 右側
        const baseY = GAME_HEIGHT * 0.2;  // 開始Y位置
        const offsetX = -20;  // 各キャラの横オフセット（左へ）
        const offsetY = 45;   // 各キャラの縦オフセット（下へ）

        for (let i = 0; i < this.partyCount; i++) {
            const x = baseX + (offsetX * i);
            const y = baseY + (offsetY * i);

            // プレイヤースプライトを作成（右向き固定）
            const sprite = this.add.sprite(x, y, 'player');
            sprite.setScale(2);

            // 右向きのアイドルアニメーション（敵の方を向く）
            // フレーム3は左向きなので、flipXで右向きに
            sprite.setFrame(3);  // 左向きフレーム
            sprite.setFlipX(true);  // 反転して右向き（敵の方向）に

            // 待機モーション（軽い揺れ）
            this.tweens.add({
                targets: sprite,
                y: y - 2,
                duration: 800 + i * 100,  // 少しずつタイミングをずらす
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            this.partySprites.push(sprite);
        }
    }

    /**
     * UIを作成（FF6風レイアウト）
     * - 左下: 敵名 + コマンドメニュー
     * - 右: パーティステータス
     */
    private createUI(): void {
        const uiY = GAME_HEIGHT - 90;  // UI開始Y位置

        // ===== 左側：敵名 + コマンドメニュー =====
        // 敵名ウィンドウ
        const enemyNameBg = this.add.graphics();
        enemyNameBg.fillStyle(0x000044, 0.9);
        enemyNameBg.fillRect(5, uiY, 100, 22);
        enemyNameBg.lineStyle(2, 0x4444aa, 1);
        enemyNameBg.strokeRect(5, uiY, 100, 22);

        // 敵HP テキスト（敵名ウィンドウ内）
        this.enemyHpText = this.add.text(
            10,
            uiY + 4,
            this.enemy.name,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff'
            }
        );

        // コマンドウィンドウの背景
        const commandBg = this.add.graphics();
        commandBg.fillStyle(0x000044, 0.9);
        commandBg.fillRect(5, uiY + 25, 100, 60);
        commandBg.lineStyle(2, 0x4444aa, 1);
        commandBg.strokeRect(5, uiY + 25, 100, 60);

        // コマンドテキスト
        const commandLabels = ['たたかう', 'ぼうぎょ', 'にげる'];
        commandLabels.forEach((label, index) => {
            const text = this.add.text(
                30,
                uiY + 32 + index * 18,
                label,
                {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '8px',
                    color: '#ffffff'
                }
            );
            this.commandTexts.push(text);
        });

        // カーソル
        this.cursor = this.add.text(
            15,
            uiY + 32,
            '▶',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff'
            }
        );

        // ===== 右側：パーティステータス =====
        const statusX = 115;
        const statusWidth = GAME_WIDTH - 120;

        const statusBg = this.add.graphics();
        statusBg.fillStyle(0x000044, 0.9);
        statusBg.fillRect(statusX, uiY, statusWidth, 85);
        statusBg.lineStyle(2, 0x4444aa, 1);
        statusBg.strokeRect(statusX, uiY, statusWidth, 85);

        // パーティメンバーステータス表示（FF6風）
        // とりくん（1人目）
        this.add.text(
            statusX + 10,
            uiY + 8,
            'とりくん',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff'
            }
        );

        // HP表示（右揃え風）
        this.playerHpText = this.add.text(
            statusX + 120,
            uiY + 8,
            `${this.playerHp}`,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#4ade80'
            }
        );
        this.playerHpText.setOrigin(1, 0);

        // HP最大値
        this.add.text(
            statusX + 122,
            uiY + 8,
            `/${this.playerMaxHp}`,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#888888'
            }
        );

        // HPバー背景
        this.playerHpBarBg = this.add.graphics();
        this.playerHpBarBg.fillStyle(0x333333, 1);
        this.playerHpBarBg.fillRect(statusX + 170, uiY + 6, 80, 12);

        // HPバー
        this.playerHpBar = this.add.graphics();
        this.drawHpBar(this.playerHpBar, statusX + 170, uiY + 6, 80, 12, this.playerHp, this.playerMaxHp);

        // 敵HPバー（非表示だが内部で使用）
        this.enemyHpBarBg = this.add.graphics();
        this.enemyHpBar = this.add.graphics();

        // メッセージテキスト（ステータスウィンドウ下部）
        this.messageText = this.add.text(
            statusX + 10,
            uiY + 30,
            '',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#ffffff',
                wordWrap: { width: statusWidth - 20 },
                lineSpacing: 4
            }
        );

        // 初期状態ではコマンドを非表示
        this.setCommandVisible(false);
    }

    /**
     * HPバーを描画
     */
    private drawHpBar(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        current: number,
        max: number,
        isEnemy: boolean = false
    ): void {
        graphics.clear();

        const ratio = Math.max(0, current / max);
        const barWidth = width * ratio;

        // 色を決定（HP残量に応じて変化）
        let color: number;
        if (isEnemy) {
            color = 0xe94560; // 敵は赤
        } else {
            if (ratio > 0.5) {
                color = 0x4ade80; // 緑
            } else if (ratio > 0.25) {
                color = 0xfbbf24; // 黄
            } else {
                color = 0xe94560; // 赤
            }
        }

        // HPバーを描画
        graphics.fillStyle(color, 1);
        graphics.fillRect(x, y, barWidth, height);

        // 光沢効果
        graphics.fillStyle(0xffffff, 0.3);
        graphics.fillRect(x, y, barWidth, height / 3);
    }

    /**
     * コマンドの表示/非表示
     */
    private setCommandVisible(visible: boolean): void {
        this.commandTexts.forEach(text => text.setVisible(visible));
        this.cursor.setVisible(visible);
    }

    /**
     * 入力のセットアップ
     */
    private setupInput(): void {
        this.input.keyboard?.on('keydown-UP', () => this.moveCommand(-1));
        this.input.keyboard?.on('keydown-DOWN', () => this.moveCommand(1));
        this.input.keyboard?.on('keydown-W', () => this.moveCommand(-1));
        this.input.keyboard?.on('keydown-S', () => this.moveCommand(1));
        this.input.keyboard?.on('keydown-SPACE', () => this.selectCommand());
        this.input.keyboard?.on('keydown-ENTER', () => this.selectCommand());
        this.input.keyboard?.on('keydown-Z', () => this.selectCommand());
    }

    /**
     * コマンドを移動
     */
    private moveCommand(direction: number): void {
        if (this.battleState !== 'playerTurn') return;

        this.selectedCommand += direction;

        if (this.selectedCommand < 0) {
            this.selectedCommand = this.commands.length - 1;
        } else if (this.selectedCommand >= this.commands.length) {
            this.selectedCommand = 0;
        }

        // FF6風UIのカーソル位置
        const uiY = GAME_HEIGHT - 90;
        this.cursor.setY(uiY + 32 + this.selectedCommand * 18);
    }

    /**
     * コマンドを選択
     */
    private selectCommand(): void {
        if (this.battleState !== 'playerTurn') return;

        const command = this.commands[this.selectedCommand];
        this.setCommandVisible(false);

        switch (command) {
            case 'attack':
                this.playerAttackAction();
                break;
            case 'defend':
                this.playerDefendAction();
                break;
            case 'escape':
                this.playerEscapeAction();
                break;
        }
    }

    /**
     * プレイヤーターン開始
     */
    private startPlayerTurn(): void {
        this.battleState = 'playerTurn';
        this.isDefending = false;
        this.showMessage('コマンド？');
        this.setCommandVisible(true);
        this.selectedCommand = 0;
        // FF6風UIのカーソル位置
        const uiY = GAME_HEIGHT - 90;
        this.cursor.setY(uiY + 32);
    }

    /**
     * プレイヤーの攻撃
     */
    private playerAttackAction(): void {
        // ダメージ計算（改善版）
        const { damage, isCritical } = this.calculateDamage(
            this.playerAttack,
            this.enemy.defense,
            false
        );

        this.enemy.hp -= damage;

        // 敵が揺れる（クリティカル時は激しく）
        this.tweens.add({
            targets: this.enemySprite,
            x: this.enemySprite.x + (isCritical ? 20 : 10),
            duration: isCritical ? 30 : 50,
            yoyo: true,
            repeat: isCritical ? 5 : 3
        });

        // ダメージポップアップ
        this.showDamagePopup(
            this.enemySprite.x,
            this.enemySprite.y - 30,
            damage,
            isCritical
        );

        // メッセージ
        const critText = isCritical ? 'クリティカル！ ' : '';
        this.showMessage(`${critText}${this.enemy.name}に${damage}のダメージ！`);
        this.updateHpDisplay();

        this.time.delayedCall(1500, () => {
            if (this.enemy.hp <= 0) {
                this.victory();
            } else {
                this.startEnemyTurn();
            }
        });
    }

    /**
     * プレイヤーの防御
     */
    private playerDefendAction(): void {
        this.isDefending = true;
        this.showMessage('みをまもっている...');

        this.time.delayedCall(1000, () => {
            this.startEnemyTurn();
        });
    }

    /**
     * プレイヤーの逃走
     */
    private playerEscapeAction(): void {
        // 50%の確率で逃げられる
        if (Phaser.Math.Between(1, 100) <= 50) {
            this.showMessage('うまく にげきれた！');
            this.battleState = 'escaped';

            this.time.delayedCall(1500, () => {
                this.endBattle();
            });
        } else {
            this.showMessage('にげられなかった！');

            this.time.delayedCall(1000, () => {
                this.startEnemyTurn();
            });
        }
    }

    /**
     * 敵ターン
     */
    private startEnemyTurn(): void {
        this.battleState = 'enemyTurn';

        // ダメージ計算（改善版）
        const { damage, isCritical } = this.calculateDamage(
            this.enemy.attack,
            this.playerDefense,
            this.isDefending
        );

        this.playerHp -= damage;

        // プレイヤーのダメージエフェクト（画面揺れ）
        const shakeIntensity = isCritical ? 0.02 : 0.01;
        this.cameras.main.shake(isCritical ? 200 : 100, shakeIntensity);

        // ダメージポップアップ（画面中央下部）
        this.showDamagePopup(
            GAME_WIDTH / 2,
            GAME_HEIGHT * 0.65,
            damage,
            isCritical
        );

        // メッセージ
        const critText = isCritical ? 'クリティカル！ ' : '';
        const defenseText = this.isDefending ? '（ぼうぎょ中）' : '';
        this.showMessage(`${this.enemy.name}のこうげき！\n${critText}${damage}のダメージをうけた！${defenseText}`);
        this.updateHpDisplay();

        this.time.delayedCall(2000, () => {
            if (this.playerHp <= 0) {
                this.defeat();
            } else {
                this.startPlayerTurn();
            }
        });
    }

    /**
     * 勝利
     */
    private victory(): void {
        this.battleState = 'victory';

        // 敵の消滅アニメーション
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0,
            scaleX: 0,
            scaleY: 0,
            duration: 500,
            ease: 'Power2'
        });

        this.showMessage(`${this.enemy.name}をたおした！\n10けいけんちをかくとく！`);

        this.time.delayedCall(2500, () => {
            this.endBattle();
        });
    }

    /**
     * 敗北
     */
    private defeat(): void {
        this.battleState = 'defeat';
        this.showMessage('ぜんめつ...');

        this.cameras.main.fadeOut(2000, 255, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('TitleScene');
        });
    }

    /**
     * バトル終了
     */
    private endBattle(): void {
        this.cameras.main.fadeOut(500, 0, 0, 0);

        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(this.returnScene, {
                playerPosition: this.playerPosition
            });
        });
    }

    /**
     * メッセージを表示
     */
    private showMessage(text: string): void {
        this.messageText.setText(text);
    }

    /**
     * HP表示を更新
     */
    private updateHpDisplay(): void {
        // FF6風UIの座標
        const uiY = GAME_HEIGHT - 90;
        const statusX = 115;

        // テキスト更新（FF6風：HP数値のみ）
        this.playerHpText.setText(`${Math.max(0, this.playerHp)}`);

        // HPバー更新
        this.drawHpBar(this.playerHpBar, statusX + 170, uiY + 6, 80, 12, this.playerHp, this.playerMaxHp);
    }

    /**
     * ダメージ計算（改善版）
     * - 基本ダメージ = 攻撃力 - 防御力/2
     * - 乱数 0.9〜1.1倍
     * - クリティカル 15%で1.5倍
     */
    private calculateDamage(
        attack: number,
        defense: number,
        isDefending: boolean
    ): { damage: number; isCritical: boolean } {
        // 基本ダメージ
        let baseDamage = attack - Math.floor(defense / 2);

        // 乱数（0.9〜1.1倍）
        const randomMultiplier = 0.9 + Math.random() * 0.2;
        baseDamage = Math.floor(baseDamage * randomMultiplier);

        // クリティカル判定（15%）
        const isCritical = Math.random() < 0.15;
        if (isCritical) {
            baseDamage = Math.floor(baseDamage * 1.5);
        }

        // 防御中は半減
        if (isDefending) {
            baseDamage = Math.floor(baseDamage / 2);
        }

        // 最低1ダメージ保証
        const damage = Math.max(1, baseDamage);

        return { damage, isCritical };
    }

    /**
     * ダメージポップアップを表示
     */
    private showDamagePopup(
        x: number,
        y: number,
        damage: number,
        isCritical: boolean
    ): void {
        const color = isCritical ? '#fbbf24' : '#ffffff';
        const fontSize = isCritical ? '14px' : '12px';
        const text = isCritical ? `${damage}!` : `${damage}`;

        const popup = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: fontSize,
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        popup.setOrigin(0.5);
        popup.setDepth(100);

        // アニメーション（上に浮かびながらフェードアウト）
        this.tweens.add({
            targets: popup,
            y: y - 40,
            alpha: 0,
            duration: 1000,
            ease: 'Power2',
            onComplete: () => {
                popup.destroy();
            }
        });

        // クリティカル時は揺れ効果
        if (isCritical) {
            this.tweens.add({
                targets: popup,
                scaleX: 1.2,
                scaleY: 1.2,
                duration: 100,
                yoyo: true,
                repeat: 2
            });
        }
    }
}
