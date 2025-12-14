/**
 * BattleScene - バトル画面
 * オクトパストラベラー風のターン制バトル（MVP版）
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '@/config/gameConfig';
import { GameStateManager } from '@/managers/GameStateManager';
import { WeaknessType } from '@/types';

/** バトルコマンド */
type BattleCommand = 'attack' | 'defend' | 'escape';

/** バトルステート */
type BattleState = 'start' | 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat' | 'escaped' | 'waiting';

/** 弱点属性タイプ */


/** パーティメンバーデータ */
interface PartyMemberData {
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;         // ATB回復速度に影響
    atb: number;
    maxAtb: number;
    spriteKey: string;
    isDefending: boolean;  // 防御中フラグ
    weaponType: WeaknessType; // 装備武器のタイプ（MVPでは固定）
}

/** 敵データ */
interface EnemyData {
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;         // ATB回復速度に影響
    atb: number;           // 敵もATBを持つ
    maxAtb: number;
    color: number;
    width: number;
    height: number;
    spriteKey: string;
    // ブレイクシステム
    shield: number;              // 現在のシールドポイント
    maxShield: number;           // 最大シールドポイント
    weaknesses: WeaknessType[];  // 弱点リスト
    revealedWeaknesses: boolean[]; // 発見済みフラグ
    isBroken: boolean;           // ブレイク状態かどうか
    breakStartTurn: number;      // ブレイクしたターン数（グローバルターン）
}

/** 敵データベース */
const ENEMY_DATABASE: Record<string, EnemyData> = {
    slime: {
        name: 'スライム',
        hp: 500,
        maxHp: 500,
        attack: 10,
        defense: 2,
        speed: 20,           // 低速な敵
        atb: 0,
        maxAtb: 100,
        color: 0xe94560,
        width: 32,
        height: 32,
        spriteKey: 'enemy-slime',
        shield: 4,
        maxShield: 4,
        weaknesses: ['sword', 'fire'],
        revealedWeaknesses: [false, false],
        isBroken: false,
        breakStartTurn: 0
    },
    bat: {
        name: 'コウモリ',
        hp: 350,
        maxHp: 350,
        attack: 15,
        defense: 1,
        speed: 60,           // 素早い敵
        atb: 0,
        maxAtb: 100,
        color: 0x8b5cf6,
        width: 32,
        height: 32,
        spriteKey: 'enemy-bat',
        shield: 3,
        maxShield: 3,
        weaknesses: ['bow', 'wind'],
        revealedWeaknesses: [false, false],
        isBroken: false,
        breakStartTurn: 0
    },
    goblin: {
        name: 'ゴブリン',
        hp: 800,
        maxHp: 800,
        attack: 20,
        defense: 5,
        speed: 35,           // 中速な敵
        atb: 0,
        maxAtb: 100,
        color: 0xf59e0b,
        width: 32,
        height: 32,
        spriteKey: 'enemy-goblin',
        shield: 5,
        maxShield: 5,
        weaknesses: ['sword', 'spear', 'fire'],
        revealedWeaknesses: [false, false, false],
        isBroken: false,
        breakStartTurn: 0
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
    private partyCount: number = 4;  // FF6風4人パーティ

    // パーティメンバーデータ（ATBゲージ含む）
    // 設計書3.5.2: ATB回復速度 = (baseSpeed + characterSpeed) * speedModifier
    // パーティメンバーデータ（ATBゲージ含む）
    // GameStateManagerから取得して設定
    private partyMembers: PartyMemberData[] = [];

    // 現在行動可能なメンバーのインデックス（-1 = 誰も行動可能でない）
    private activePartyMemberIndex: number = -1;

    // ATB設定（設計書3.5.2準拠）
    private readonly ATB_BASE_SPEED = 0.3;   // 基本回復速度
    private readonly ATB_SPEED_DIVISOR = 100; // スピード値の除数

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

    // パーティメンバーのHP表示（4人分）
    private partyHpTexts: Phaser.GameObjects.Text[] = [];
    private partyAtbBars: Phaser.GameObjects.Graphics[] = [];  // ATBゲージ

    // ブレイクシステムUI
    private enemyShieldText!: Phaser.GameObjects.Text;
    private enemyWeaknessText!: Phaser.GameObjects.Text;
    private breakText!: Phaser.GameObjects.Text;
    private stunStars: Phaser.GameObjects.Text[] = []; // ピヨり星

    private stunTween!: Phaser.Tweens.Tween;

    // ターン数表示
    private turnCount: number = 0;
    private turnText!: Phaser.GameObjects.Text;
    private actedPartyMemberIndices: Set<number> = new Set(); // 今のターンに行動済みのメンバーインデックス

    // HPバー（後方互換性のため残す）
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
        this.activePartyMemberIndex = -1;

        // パーティデータをGameStateManagerから取得
        const globalParty = GameStateManager.getInstance().getParty();
        this.partyMembers = globalParty.map(member => ({
            name: member.name,
            hp: member.currentHp,
            maxHp: member.currentStats.maxHp,
            attack: member.currentStats.attack,
            defense: member.currentStats.defense,
            speed: member.currentStats.speed,
            atb: 0, // ランダムに設定するため一旦0
            maxAtb: 100,
            spriteKey: member.battleSpriteKey,
            isDefending: false,
            weaponType: member.defaultWeapon
        }));
        this.partyCount = this.partyMembers.length;

        // 設計書3.5.5: 通常エンカウントのATB初期値（ランダム30-70）
        for (const member of this.partyMembers) {
            member.atb = Phaser.Math.Between(30, 70);
            member.isDefending = false;
        }
        this.enemy.atb = Phaser.Math.Between(30, 70);
        // ターン数リセット
        this.turnCount = 1;
        this.actedPartyMemberIndices.clear();
    }

    create(): void {
        console.log('BattleScene: Creating...');

        this.createBackground();
        this.createEnemySprite();
        this.createEnemyStatusUI(); // 新規追加
        this.createPartySprites();  // FF6風：パーティを右側に配置
        this.createUI();
        this.setupInput();

        // フェードイン後にバトル開始
        this.cameras.main.fadeIn(300);

        this.time.delayedCall(500, () => {
            this.showMessage(`${this.enemy.name}があらわれた！`);
            this.time.delayedCall(1500, () => {
                // waiting状態に遷移し、ATBシステムでターンを管理
                this.battleState = 'waiting';
                this.showMessage('');
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

        // スプライトのスケール（解像度2倍対応：4倍）
        this.enemySprite.setScale(4);

        // アイドルアニメーションを再生
        const animKey = `${this.enemy.spriteKey}-idle`;
        if (this.anims.exists(animKey)) {
            this.enemySprite.play(animKey);
        }

        // 軽い浮遊アニメーション（コウモリはより大きく）（解像度2倍）
        const floatAmount = this.enemyType === 'bat' ? 16 : 6;
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
     * 敵のステータス表示（シールド、弱点）を作成
     */
    private createEnemyStatusUI(): void {
        const x = this.enemySprite.x;
        const y = this.enemySprite.y + 80;

        // シールドテキスト
        this.enemyShieldText = this.add.text(
            x,
            y,
            '',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '16px',
                color: '#60a5fa', // 青色
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        this.enemyShieldText.setOrigin(0.5);

        // 弱点テキスト
        this.enemyWeaknessText = this.add.text(
            x,
            y + 24,
            '',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        );
        this.enemyWeaknessText.setOrigin(0.5);

        // BREAK! テキスト（初期は非表示）
        this.breakText = this.add.text(
            x,
            this.enemySprite.y,
            'BREAK!',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '32px',
                color: '#fbbf24', // 黄色
                stroke: '#000000',
                strokeThickness: 6
            }
        );
        this.breakText.setOrigin(0.5);
        this.breakText.setVisible(false);
        this.breakText.setDepth(200);

        // ピヨり星（スタン表現）を作成
        this.createStunStars();

        this.updateEnemyStatusDisplay();
    }

    /**
     * ピヨり星（スタン表現）を作成
     */
    private createStunStars(): void {
        const centerX = this.enemySprite.x;
        const centerY = this.enemySprite.y - 40; // 頭上

        // 3つの星を作成
        for (let i = 0; i < 3; i++) {
            const star = this.add.text(centerX, centerY, '★', {
                fontSize: '24px',
                color: '#fbbf24',
                stroke: '#000000',
                strokeThickness: 2
            });
            star.setOrigin(0.5);
            star.setVisible(false);
            star.setDepth(150);
            this.stunStars.push(star);
        }

        // 星が回るアニメーション（常に実行し、visibleで制御）
        this.stunTween = this.tweens.addCounter({
            from: 0,
            to: 360,
            duration: 2000,
            repeat: -1,
            onUpdate: (tween) => {
                const angle = tween.getValue() || 0;
                const radius = 30; // 半径

                this.stunStars.forEach((star, index) => {
                    // 120度ずらす
                    const starAngle = angle + (index * 120);
                    const rad = Phaser.Math.DegToRad(starAngle);

                    star.x = this.enemySprite.x + Math.cos(rad) * radius;
                    star.y = (this.enemySprite.y - 40) + Math.sin(rad) * (radius * 0.3); // 楕円軌道
                    star.setAlpha(0.7 + Math.sin(rad) * 0.3); // 奥に行くと少し薄く
                });
            }
        });

        // 初期状態は停止・非表示
        this.stunTween.pause();
    }

    /**
     * 敵のステータス表示を更新
     */
    private updateEnemyStatusDisplay(): void {
        if (!this.enemy) return;

        // シールド表示
        if (this.enemy.isBroken) {
            this.enemyShieldText.setText('SHIELD BROKEN!');
            this.enemyShieldText.setColor('#fbbf24'); // 黄色
        } else {
            this.enemyShieldText.setText(`SHIELD: ${this.enemy.shield}`);
            this.enemyShieldText.setColor('#60a5fa'); // 青色
        }

        // 弱点表示
        let weaknessStr = '';
        this.enemy.weaknesses.forEach((weakness, index) => {
            const isRevealed = this.enemy.revealedWeaknesses[index];
            const icon = this.getWeaknessIcon(weakness);
            weaknessStr += isRevealed ? `[${icon}] ` : '[?] ';
        });
        this.enemyWeaknessText.setText(weaknessStr.trim());
    }

    /**
     * 弱点タイプから表示用アイコン（文字）を取得
     */
    private getWeaknessIcon(type: WeaknessType): string {
        const icons: Record<WeaknessType, string> = {
            'sword': '剣', 'spear': '槍', 'dagger': '短',
            'axe': '斧', 'bow': '弓', 'staff': '杖',
            'fire': '火', 'ice': '氷', 'lightning': '雷',
            'wind': '風', 'light': '光', 'dark': '闇'
        };
        return icons[type] || '?';
    }

    /**
     * パーティスプライトを作成（FF6風：右側に斜め配置）
     * 1人目が左上で奥、4人目が右下で手前に並ぶ（右下方向への斜め配置）
     */
    private createPartySprites(): void {
        // パーティスプライトをクリア
        this.partySprites.forEach(sprite => sprite.destroy());
        this.partySprites = [];

        // パーティメンバーの配置（最大4人）（解像度2倍対応）
        // FF6風：1人目が左上で奥、4人目が右下で手前（右下方向への斜め配置）
        const baseX = GAME_WIDTH * 0.62;  // 開始位置（左寄り）
        const baseY = GAME_HEIGHT * 0.12;  // 開始y位置（上寄り）
        const offsetX = 28;   // 各キャラの横オフセット（右へ）（解像度2倍）
        const offsetY = 64;   // 各キャラの縦オフセット（下へ）（解像度2倍）

        for (let i = 0; i < this.partyCount; i++) {
            const x = baseX + (offsetX * i);
            const y = baseY + (offsetY * i);

            // クラスプロパティのpartyMembersから取得
            const member = this.partyMembers[i];
            const sprite = this.add.sprite(x, y, member.spriteKey);
            sprite.setScale(4);  // 解像度2倍対応：4倍

            // 深度を設定（1人目=index0が奥=depth低、4人目=index3が手前=depth高）
            // 下にいるキャラほど手前に表示
            sprite.setDepth(70 + (i * 10));  // 70, 80, 90, 100

            // 待機ポーズ（フレーム0）- 左向きで敵を見据える
            sprite.setFrame(0);

            // 待機モーション（軽い揺れ）（解像度2倍）
            this.tweens.add({
                targets: sprite,
                y: y - 4,
                duration: 800 + i * 100,
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
     * - 右: パーティ4人分のステータス
     */
    private createUI(): void {
        const uiY = GAME_HEIGHT - 180;  // UI開始Y位置（解像度2倍）

        // ===== 左側：敵名 + コマンドメニュー =====
        // 敵名ウィンドウ
        const enemyNameBg = this.add.graphics();
        enemyNameBg.fillStyle(0x000044, 0.9);
        enemyNameBg.fillRect(10, uiY, 200, 44);
        enemyNameBg.lineStyle(3, 0x4444aa, 1);
        enemyNameBg.strokeRect(10, uiY, 200, 44);

        // 敵名テキスト
        this.enemyHpText = this.add.text(
            20,
            uiY + 8,
            this.enemy.name,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '16px',
                color: '#ffffff'
            }
        );

        // コマンドウィンドウの背景
        const commandBg = this.add.graphics();
        commandBg.fillStyle(0x000044, 0.9);
        commandBg.fillRect(10, uiY + 50, 200, 120);
        commandBg.lineStyle(3, 0x4444aa, 1);
        commandBg.strokeRect(10, uiY + 50, 200, 120);

        // コマンドテキスト
        const commandLabels = ['たたかう', 'ぼうぎょ', 'にげる'];
        commandLabels.forEach((label, index) => {
            const text = this.add.text(
                60,
                uiY + 64 + index * 36,
                label,
                {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '16px',
                    color: '#ffffff'
                }
            );
            this.commandTexts.push(text);
        });

        // カーソル
        this.cursor = this.add.text(
            30,
            uiY + 64,
            '▶',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '16px',
                color: '#ffffff'
            }
        );

        // ===== 右側：パーティ4人分のステータス =====
        const statusX = 230;
        const statusWidth = GAME_WIDTH - 240;
        const memberHeight = 40;  // 各メンバーの高さ（解像度2倍）

        const statusBg = this.add.graphics();
        statusBg.fillStyle(0x000044, 0.9);
        statusBg.fillRect(statusX, uiY, statusWidth, 170);
        statusBg.lineStyle(3, 0x4444aa, 1);
        statusBg.strokeRect(statusX, uiY, statusWidth, 170);

        // 4人分のステータスを表示
        this.partyHpTexts = [];
        this.partyAtbBars = [];

        for (let i = 0; i < this.partyCount; i++) {
            const member = this.partyMembers[i];
            const rowY = uiY + 10 + (i * memberHeight);

            // メンバー名（武器種アイコン付き）
            const weaponIcon = this.getWeaknessIcon(member.weaponType);
            this.add.text(
                statusX + 10,
                rowY,
                `[${weaponIcon}]${member.name}`,
                {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '14px',
                    color: '#ffffff'
                }
            );

            // HP数値
            const hpText = this.add.text(
                statusX + 260,
                rowY,
                `${member.hp}`,
                {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '14px',
                    color: '#4ade80'
                }
            );
            hpText.setOrigin(1, 0);
            this.partyHpTexts.push(hpText);

            // ATBゲージ背景
            const barBg = this.add.graphics();
            barBg.fillStyle(0x333333, 1);
            barBg.fillRect(statusX + 270, rowY + 4, 160, 20);

            // ATBゲージ（緑色で現在値を表示）
            const atbBar = this.add.graphics();
            this.drawAtbBar(atbBar, statusX + 270, rowY + 4, 160, 20, member.atb, member.maxAtb);
            this.partyAtbBars.push(atbBar);
        }

        // 1人目をメイン用として設定
        this.playerHpText = this.partyHpTexts[0];
        this.playerHpBar = this.partyAtbBars[0];

        // 敵HPバー（非表示だが内部で使用）
        this.enemyHpBarBg = this.add.graphics();
        this.enemyHpBar = this.add.graphics();
        this.playerHpBarBg = this.add.graphics();

        // メッセージテキスト（ステータスウィンドウ外、上部）
        this.messageText = this.add.text(
            statusX + 10,
            uiY - 40,
            '',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '16px',
                color: '#ffffff',
                backgroundColor: '#000044',
                padding: { x: 10, y: 6 }
            }
        );

        // 初期状態ではコマンドを非表示
        this.setCommandVisible(false);

        // ターン数表示（左上）
        this.turnText = this.add.text(
            16,
            16,
            `TURN: ${this.turnCount}`,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '16px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
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
     * ATBゲージを描画
     * 戦うと0になり、時間経過で溜まっていく
     */
    private drawAtbBar(
        graphics: Phaser.GameObjects.Graphics,
        x: number,
        y: number,
        width: number,
        height: number,
        current: number,
        max: number
    ): void {
        graphics.clear();

        const ratio = Math.max(0, Math.min(1, current / max));
        const barWidth = width * ratio;

        // ATBゲージは緑色（満タンに近いほど明るい）
        const color = ratio >= 1 ? 0x4ade80 : 0x22c55e;

        // ATBゲージを描画
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

        // FF6風UIのカーソル位置（解像度2倍）
        const uiY = GAME_HEIGHT - 180;
        this.cursor.setY(uiY + 64 + this.selectedCommand * 36);
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

        // ターン経過判定（全員が一巡したらターン更新）
        // 現状の生存メンバー全員が行動済みかチェック
        const livingMembersIndices = this.partyMembers
            .map((m, i) => ({ hp: m.hp, index: i }))
            .filter(item => item.hp > 0)
            .map(item => item.index);

        // 生存メンバー全員が既に行動済みリストに含まれている状態で、かつ
        // 今回行動するメンバーも既に行動済みの場合（＝2巡目に入った）
        // または、全員が行動済みになったタイミングでターンを進める？
        // ユーザー要望:「4人が一巡したら1ターン」「また次の誰かの番が回ってきたらターンが進みます」

        // ロジック:
        // 1. 今回行動するメンバーが、既に actedPartyMemberIndices に含まれているかチェック
        //    含まれているなら、それは "新しい巡" の始まりとみなせる（全員が動いたかは別として、この人は2回目）
        //    ただし "4人が一巡したら" なので、全員完了チェックも必要。

        // シンプルな実装:
        // 生存者全員が actedPartyMemberIndices に入っているなら、ターン更新してクリア
        const allLivingActed = livingMembersIndices.every(i => this.actedPartyMemberIndices.has(i));

        if (allLivingActed) {
            this.turnCount++;
            this.turnText.setText(`TURN: ${this.turnCount}`);
            this.actedPartyMemberIndices.clear();
        }

        // このメンバーを行動済みに記録
        if (this.activePartyMemberIndex >= 0) {
            this.actedPartyMemberIndices.add(this.activePartyMemberIndex);
        }

        // アクティブメンバーの防御フラグをリセット
        const activeMember = this.partyMembers[this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0];
        activeMember.isDefending = false;
        this.showMessage(`${activeMember.name}のターン！`);
        this.setCommandVisible(true);
        this.selectedCommand = 0;
        // FF6風UIのカーソル位置（解像度2倍）
        const uiY = GAME_HEIGHT - 180;
        this.cursor.setY(uiY + 64);
    }

    /**
     * プレイヤーの攻撃
     */
    private playerAttackAction(): void {
        const idx = this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0;
        const activeMember = this.partyMembers[idx];

        // ATBを0にリセット
        activeMember.atb = 0;

        // ATBバーを更新（解像度2倍）
        const uiY = GAME_HEIGHT - 180;
        const statusX = 230;
        const memberHeight = 40;
        const rowY = uiY + 10 + (idx * memberHeight);

        this.drawAtbBar(
            this.partyAtbBars[idx],
            statusX + 270,
            rowY + 4,
            160,
            20,
            0,
            activeMember.maxAtb
        );

        // 弱点チェックとシールド処理
        let weaknessMultiplier = 1.0;
        let isShieldBrokenNow = false;

        // メンバーの武器属性が弱点かチェック
        const weaknessIndex = this.enemy.weaknesses.indexOf(activeMember.weaponType);
        if (weaknessIndex !== -1) {
            // 弱点ヒット！
            this.enemy.revealedWeaknesses[weaknessIndex] = true;
            weaknessMultiplier = 1.3;

            // シールド削減（ブレイク中でなければ）
            if (!this.enemy.isBroken) {
                this.enemy.shield = Math.max(0, this.enemy.shield - 1);

                // ブレイク判定
                if (this.enemy.shield === 0) {
                    this.enemy.isBroken = true;
                    this.enemy.breakStartTurn = this.turnCount; // ブレイクターンを記録
                    isShieldBrokenNow = true;
                }
            }
        }

        // ダメージ計算（改善版）- アクティブなメンバーの攻撃力を使用
        const { damage, isCritical } = this.calculateDamage(
            activeMember.attack,
            this.enemy.defense,
            false,
            weaknessMultiplier,
            this.enemy.isBroken
        );

        // パーティメンバーを攻撃ポーズに切り替え
        const sprite = this.partySprites[idx];

        // 攻撃ポーズに変更
        sprite.setFrame(1);

        // 前に踏み込むアニメーション
        const originalX = sprite.x;
        this.tweens.add({
            targets: sprite,
            x: sprite.x - 60,  // 敵に向かって踏み込む（解像度2倍）
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                // 元の位置に戻る
                this.tweens.add({
                    targets: sprite,
                    x: originalX,
                    duration: 200,
                    ease: 'Power2',
                    onComplete: () => {
                        // 待機ポーズに戻す
                        sprite.setFrame(0);
                    }
                });
            }
        });

        this.enemy.hp -= damage;

        // 敵が揺れる（クリティカル時は激しく）- 少し遅延してから
        this.time.delayedCall(150, () => {
            this.tweens.add({
                targets: this.enemySprite,
                x: this.enemySprite.x + (isCritical ? 40 : 20),  // 解像度2倍
                duration: isCritical ? 30 : 50,
                yoyo: true,
                repeat: isCritical ? 5 : 3
            });

            // ダメージポップアップ
            this.showDamagePopup(
                this.enemySprite.x,
                this.enemySprite.y - 60,  // 解像度2倍
                damage,
                isCritical,
                weaknessMultiplier > 1.0
            );

            // ブレイク演出
            if (isShieldBrokenNow) {
                this.showBreakEffect();
            }

            // ステータス表示更新
            this.updateEnemyStatusDisplay();
        });

        // メッセージ
        const critText = isCritical ? 'クリティカル！ ' : '';
        const weakText = weaknessMultiplier > 1.0 ? 'じゃくてん！ ' : '';
        this.showMessage(`${critText}${weakText}${this.enemy.name}に${damage}のダメージ！`);
        this.updateHpDisplay();

        this.time.delayedCall(1500, () => {
            if (this.enemy.hp <= 0) {
                this.victory();
            } else {
                // waiting状態に戻り、ATBで次のターンを判定
                this.battleState = 'waiting';
                this.showMessage('');
            }
        });
    }

    /**
     * プレイヤーの防御
     */
    private playerDefendAction(): void {
        // アクティブメンバーの防御フラグをオン
        const activeMember = this.partyMembers[this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0];
        activeMember.isDefending = true;
        activeMember.atb = 0;
        this.showMessage(`${activeMember.name}はみをまもっている...`);

        this.time.delayedCall(1000, () => {
            // waiting状態に戻る
            this.battleState = 'waiting';
            this.showMessage('');
        });
    }

    /**
     * プレイヤーの逃走
     */
    private playerEscapeAction(): void {
        // アクティブメンバーのATBをリセット
        const activeMember = this.partyMembers[this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0];
        activeMember.atb = 0;

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
                // waiting状態に戻る
                this.battleState = 'waiting';
                this.showMessage('');
            });
        }
    }

    /**
     * 敵ターン
     */
    private startEnemyTurn(): void {
        this.battleState = 'enemyTurn';

        // 敵の行動はターン数に影響しない（プレイヤーの行動巡で管理）

        // ブレイク状態からの回復チェック
        if (this.enemy.isBroken) {
            // ブレイクしたターン + 2ターン目以降に回復
            // 例: T4ブレイク -> T4スタン, T5スタン -> T6回復
            const recoveryTurn = this.enemy.breakStartTurn + 2;

            if (this.turnCount >= recoveryTurn) {
                this.enemy.isBroken = false;
                this.enemy.shield = this.enemy.maxShield; // シールド全回復
                this.updateEnemyStatusDisplay();
                this.enemySprite.clearTint(); // 色を戻す
                this.setStunStarsVisible(false); // 星を消す

                this.showMessage(`${this.enemy.name}は 体勢を立て直した！`);
            } else {
                this.showMessage(`${this.enemy.name}は 気絶している...`);
            }

            // 行動スキップ（回復時も行動はできない）
            this.time.delayedCall(2000, () => {
                this.battleState = 'waiting';
                this.showMessage('');
            });
            return;
        }

        // 生存メンバーからランダムにターゲットを選択
        const aliveMembers = this.partyMembers
            .map((member, index) => ({ member, index }))
            .filter(item => item.member.hp > 0);

        if (aliveMembers.length === 0) {
            this.defeat();
            return;
        }

        const targetData = aliveMembers[Phaser.Math.Between(0, aliveMembers.length - 1)];
        const targetMember = targetData.member;
        const targetSprite = this.partySprites[targetData.index];

        // ダメージ計算（改善版）
        const { damage, isCritical } = this.calculateDamage(
            this.enemy.attack,
            targetMember.defense,
            targetMember.isDefending
        );

        targetMember.hp -= damage;

        // ターゲットのみダメージポーズとアニメーション
        targetSprite.setFrame(2); // ダメージポーズ

        // 後ろに仰け反るアニメーション
        this.tweens.add({
            targets: targetSprite,
            x: targetSprite.x + 30,  // 後ろに仰け反る（解像度2倍）
            duration: 100,
            ease: 'Power2',
            yoyo: true,
            onComplete: () => {
                // 待機ポーズに戻す
                this.time.delayedCall(300, () => {
                    if (targetMember.hp > 0) {
                        targetSprite.setFrame(0);
                    } else {
                        // 戦闘不能時は倒れたままにするなどの処理（今回はフレーム2のままにする等）
                        // MVPではフレーム2（ダメージポーズ）のままにしておく、あるいは専用の戦闘不能ポーズがあればセット
                        targetSprite.setFrame(2);
                        targetSprite.setTint(0x888888); // 暗くする
                    }
                });
            }
        });

        // プレイヤーのダメージエフェクト（画面揺れ）
        const shakeIntensity = isCritical ? 0.02 : 0.01;
        this.cameras.main.shake(isCritical ? 200 : 100, shakeIntensity);

        // ダメージポップアップ（ターゲット付近）
        this.showDamagePopup(
            targetSprite.x,
            targetSprite.y - 60,  // 解像度2倍
            damage,
            isCritical
        );

        // メッセージ
        const critText = isCritical ? 'クリティカル！ ' : '';
        const defenseText = targetMember.isDefending ? '（ぼうぎょ中）' : '';
        this.showMessage(`${this.enemy.name}のこうげき！\n${targetMember.name}に${damage}のダメージ！${defenseText}`);
        this.updateHpDisplay();

        this.time.delayedCall(2000, () => {
            // パーティ全滅チェック（全員のHPが0以下）
            const allDead = this.partyMembers.every(m => m.hp <= 0);
            if (allDead) {
                this.defeat();
            } else {
                // waiting状態に戻り、ATBで次のターンを判定
                this.battleState = 'waiting';
                this.showMessage('');
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
        // 戦闘結果をグローバルステートに反映
        const globalParty = GameStateManager.getInstance().getParty();
        this.partyMembers.forEach((localMember, index) => {
            if (globalParty[index]) {
                globalParty[index].currentHp = localMember.hp;
                // 戦闘不能状態の更新
                globalParty[index].isDead = localMember.hp <= 0;
            }
        });

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
        // FF6風UIの座標（解像度2倍）
        const uiY = GAME_HEIGHT - 180;
        const statusX = 230;

        // テキスト更新（FF6風：HP数値のみ）- 各メンバーのHPを更新
        for (let i = 0; i < this.partyCount; i++) {
            const member = this.partyMembers[i];
            this.partyHpTexts[i].setText(`${Math.max(0, member.hp)}`);
        }

        // HPバー更新は不要（ATBバーのみ使用）
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
        isDefending: boolean,
        weaknessMultiplier: number = 1.0,
        isBroken: boolean = false
    ): { damage: number; isCritical: boolean } {
        // 基本ダメージ
        let baseDamage = attack - Math.floor(defense / 2);

        // 乱数（0.9〜1.1倍）
        const randomMultiplier = 0.9 + Math.random() * 0.2;
        baseDamage = Math.floor(baseDamage * randomMultiplier);

        // 弱点ボーナス
        baseDamage = Math.floor(baseDamage * weaknessMultiplier);

        // クリティカル判定（15%）
        const isCritical = Math.random() < 0.15;
        if (isCritical) {
            baseDamage = Math.floor(baseDamage * 1.5);
        }

        // ブレイクボーナス（2倍）
        if (isBroken) {
            baseDamage = Math.floor(baseDamage * 2.0);
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
        isCritical: boolean,
        isWeakness: boolean = false
    ): void {
        const color = isCritical ? '#fbbf24' : (isWeakness ? '#ef4444' : '#ffffff');
        const fontSize = isCritical ? '28px' : '24px';
        const text = isCritical ? `${damage}!` : `${damage}`;

        const popup = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: fontSize,
            color: color,
            stroke: '#000000',
            strokeThickness: 6
        });
        popup.setOrigin(0.5);
        popup.setDepth(100);

        // アニメーション（上に浮かびながらフェードアウト）
        this.tweens.add({
            targets: popup,
            y: y - 80,
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

    private showBreakEffect(): void {
        this.breakText.setVisible(true);
        this.breakText.setScale(0);
        this.breakText.setAlpha(1);

        // テキストのポップアニメーション
        this.tweens.add({
            targets: this.breakText,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 300,
            ease: 'Back.out',
            onComplete: () => {
                this.tweens.add({
                    targets: this.breakText,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 200,
                    ease: 'Sine.out',
                    onComplete: () => {
                        // 少し表示してからフェードアウト
                        this.tweens.add({
                            targets: this.breakText,
                            alpha: 0,
                            duration: 500,
                            delay: 1000,
                            onComplete: () => {
                                this.breakText.setVisible(false);
                            }
                        });
                    }
                });
            }
        });

        // シールド破壊エフェクト
        this.playShieldBreakEffect();

        // 画面揺れ（激しく）
        this.cameras.main.shake(500, 0.03);

        // 敵のフラッシュ
        this.tweens.add({
            targets: this.enemySprite,
            alpha: 0.5,
            duration: 100,
            yoyo: true,
            repeat: 5
        });

        // 敵の色を暗くする（スタン表現）
        this.enemySprite.setTint(0x888888);

        // ピヨり星を表示
        this.setStunStarsVisible(true);
    }

    /**
     * ピヨり星の表示切り替え
     */
    private setStunStarsVisible(visible: boolean): void {
        this.stunStars.forEach(star => star.setVisible(visible));
        if (visible) {
            this.stunTween.resume();
        } else {
            this.stunTween.pause();
        }
    }

    /**
     * シールド破壊エフェクト（破片が飛び散る）
     */
    private playShieldBreakEffect(): void {
        const x = this.enemySprite.x;
        const y = this.enemySprite.y;

        // 16個の破片を生成
        for (let i = 0; i < 16; i++) {
            const angle = Phaser.Math.Between(0, 360);
            const speed = Phaser.Math.Between(100, 200); // 速度アップ
            const rotation = Phaser.Math.Between(0, 360);

            // 破片の形状（三角形）
            const shard = this.add.graphics();
            shard.fillStyle(0x60a5fa, 1); // シールド色（青）
            shard.lineStyle(1, 0xffffff, 0.8); // 白い縁取り

            // ランダムな形状の三角形（サイズ調整）
            const s = 6; // 基本サイズ
            const p1 = { x: Phaser.Math.Between(-s, s), y: Phaser.Math.Between(-s, s) };
            const p2 = { x: Phaser.Math.Between(-s, s), y: Phaser.Math.Between(-s, s) };
            const p3 = { x: Phaser.Math.Between(-s, s), y: Phaser.Math.Between(-s, s) };

            shard.fillTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
            shard.strokeTriangle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);

            shard.x = x;
            shard.y = y;
            shard.setScale(3); // ピクセルアートに合わせて拡大
            shard.setDepth(250); // 最前面に近く

            // 飛び散るアニメーション
            const rad = Phaser.Math.DegToRad(angle);
            const targetX = x + Math.cos(rad) * speed;
            const targetY = y + Math.sin(rad) * speed;

            this.tweens.add({
                targets: shard,
                x: targetX,
                y: targetY,
                angle: rotation + 180, // 回転しながら飛ぶ
                alpha: 0,
                duration: 600,
                ease: 'Cubic.out',
                onComplete: () => {
                    shard.destroy();
                }
            });
        }

        // 破裂音風のフラッシュリング
        const ring = this.add.graphics();
        ring.lineStyle(4, 0xffffff, 1);
        ring.strokeCircle(0, 0, 20);
        ring.x = x;
        ring.y = y;
        ring.setDepth(149);

        this.tweens.add({
            targets: ring,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 400,
            ease: 'Quad.out',
            onComplete: () => {
                ring.destroy();
            }
        });
    }

    /**
     * 毎フレーム更新（ATBゲージの回復処理）
     * 設計書3.5準拠: ATB回復速度 = (baseSpeed + characterSpeed/100)
     */
    update(time: number, delta: number): void {
        // バトル終了時は何もしない
        if (this.battleState === 'start' || this.battleState === 'victory' ||
            this.battleState === 'defeat' || this.battleState === 'escaped') {
            return;
        }

        // ウェイトモード: プレイヤーターン中はATB停止（設計書3.5.4）
        if (this.battleState === 'playerTurn') {
            return;
        }

        // 敵ターン中もATB停止
        if (this.battleState === 'enemyTurn') {
            return;
        }

        // waiting状態: ATBを更新してターン開始判定
        const uiY = GAME_HEIGHT - 180;
        const statusX = 230;
        const memberHeight = 40;

        // === パーティメンバーのATB回復 ===
        for (let i = 0; i < this.partyCount; i++) {
            const member = this.partyMembers[i];

            // 戦闘不能チェック
            if (member.hp <= 0) {
                member.atb = 0;
                continue;
            }

            // ATBが満タンでない場合は回復
            if (member.atb < member.maxAtb) {
                // 設計書3.5.2: ATB回復速度 = (baseSpeed + characterSpeed/100)
                const atbRecovery = this.ATB_BASE_SPEED + (member.speed / this.ATB_SPEED_DIVISOR);
                member.atb = Math.min(member.maxAtb, member.atb + atbRecovery);

                // ATBバーを更新
                const rowY = uiY + 10 + (i * memberHeight);
                this.drawAtbBar(
                    this.partyAtbBars[i],
                    statusX + 270,
                    rowY + 4,
                    160,
                    20,
                    member.atb,
                    member.maxAtb
                );
            }
        }

        // === 敵のATB回復 ===
        if (this.enemy.hp > 0 && this.enemy.atb < this.enemy.maxAtb) {
            const enemyAtbRecovery = this.ATB_BASE_SPEED + (this.enemy.speed / this.ATB_SPEED_DIVISOR);
            this.enemy.atb = Math.min(this.enemy.maxAtb, this.enemy.atb + enemyAtbRecovery);
        }

        // === ターン開始判定 ===
        // パーティメンバーでATBが満タンのキャラがいればプレイヤーターン
        const readyMemberIndex = this.partyMembers.findIndex(
            (m, i) => m.hp > 0 && m.atb >= m.maxAtb
        );

        if (readyMemberIndex >= 0) {
            this.activePartyMemberIndex = readyMemberIndex;
            this.startPlayerTurn();
            return;
        }

        // 敵のATBが満タンなら敵ターン
        if (this.enemy.hp > 0 && this.enemy.atb >= this.enemy.maxAtb) {
            this.enemy.atb = 0; // 敵ATBをリセット
            this.startEnemyTurn();
            return;
        }
    }
}
