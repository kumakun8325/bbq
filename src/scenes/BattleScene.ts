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
        height: 32
    },
    bat: {
        name: 'コウモリ',
        hp: 20,
        maxHp: 20,
        attack: 8,
        defense: 1,
        color: 0x8b5cf6,
        width: 24,
        height: 24
    },
    goblin: {
        name: 'ゴブリン',
        hp: 40,
        maxHp: 40,
        attack: 10,
        defense: 3,
        color: 0xf59e0b,
        width: 32,
        height: 32
    }
};

export class BattleScene extends Phaser.Scene {
    private enemy!: EnemyData;
    private enemySprite!: Phaser.GameObjects.Rectangle;
    private returnScene: string = 'MapScene';
    private playerPosition: { x: number; y: number } = { x: 0, y: 0 };

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

    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data: { enemyType?: string; returnScene?: string; playerPosition?: { x: number; y: number } }): void {
        const enemyType = data.enemyType || 'slime';
        this.enemy = { ...ENEMY_DATABASE[enemyType] };
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
     * 敵スプライトを作成
     */
    private createEnemySprite(): void {
        this.enemySprite = this.add.rectangle(
            GAME_WIDTH / 2,
            GAME_HEIGHT * 0.35,
            this.enemy.width,
            this.enemy.height,
            this.enemy.color
        );

        // 揺れアニメーション
        this.tweens.add({
            targets: this.enemySprite,
            y: this.enemySprite.y - 5,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * UIを作成
     */
    private createUI(): void {
        // コマンドウィンドウの背景
        const commandBg = this.add.graphics();
        commandBg.fillStyle(0x000000, 0.8);
        commandBg.fillRoundedRect(10, GAME_HEIGHT - 100, 150, 90, 5);
        commandBg.lineStyle(2, 0x4ade80, 1);
        commandBg.strokeRoundedRect(10, GAME_HEIGHT - 100, 150, 90, 5);

        // コマンドテキスト
        const commandLabels = ['たたかう', 'ぼうぎょ', 'にげる'];
        commandLabels.forEach((label, index) => {
            const text = this.add.text(
                50,
                GAME_HEIGHT - 85 + index * 25,
                label,
                {
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize: '10px',
                    color: '#ffffff'
                }
            );
            this.commandTexts.push(text);
        });

        // カーソル
        this.cursor = this.add.text(
            25,
            GAME_HEIGHT - 85,
            '▶',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '10px',
                color: '#4ade80'
            }
        );

        // メッセージウィンドウ
        const messageBg = this.add.graphics();
        messageBg.fillStyle(0x000000, 0.8);
        messageBg.fillRoundedRect(170, GAME_HEIGHT - 100, GAME_WIDTH - 180, 90, 5);
        messageBg.lineStyle(2, 0xfbbf24, 1);
        messageBg.strokeRoundedRect(170, GAME_HEIGHT - 100, GAME_WIDTH - 180, 90, 5);

        this.messageText = this.add.text(
            185,
            GAME_HEIGHT - 85,
            '',
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '9px',
                color: '#ffffff',
                wordWrap: { width: GAME_WIDTH - 210 },
                lineSpacing: 5
            }
        );

        // HP表示
        const statusBg = this.add.graphics();
        statusBg.fillStyle(0x000000, 0.7);
        statusBg.fillRoundedRect(GAME_WIDTH - 150, 10, 140, 50, 5);

        this.playerHpText = this.add.text(
            GAME_WIDTH - 140,
            20,
            `HP: ${this.playerHp}/${this.playerMaxHp}`,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#4ade80'
            }
        );

        this.enemyHpText = this.add.text(
            GAME_WIDTH - 140,
            40,
            `${this.enemy.name}: ${this.enemy.hp}`,
            {
                fontFamily: '"Press Start 2P", monospace',
                fontSize: '8px',
                color: '#e94560'
            }
        );

        // 初期状態ではコマンドを非表示
        this.setCommandVisible(false);
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

        this.cursor.setY(GAME_HEIGHT - 85 + this.selectedCommand * 25);
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
        this.cursor.setY(GAME_HEIGHT - 85);
    }

    /**
     * プレイヤーの攻撃
     */
    private playerAttackAction(): void {
        const damage = Math.max(1, this.playerAttack - this.enemy.defense);
        this.enemy.hp -= damage;

        // 敵が揺れる
        this.tweens.add({
            targets: this.enemySprite,
            x: this.enemySprite.x + 10,
            duration: 50,
            yoyo: true,
            repeat: 3
        });

        this.showMessage(`${this.enemy.name}に${damage}のダメージ！`);
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

        let damage = Math.max(1, this.enemy.attack - this.playerDefense);
        if (this.isDefending) {
            damage = Math.floor(damage / 2);
        }

        this.playerHp -= damage;

        // プレイヤーのダメージエフェクト（画面揺れ）
        this.cameras.main.shake(100, 0.01);

        const defenseText = this.isDefending ? '（ぼうぎょ中）' : '';
        this.showMessage(`${this.enemy.name}のこうげき！\n${damage}のダメージをうけた！${defenseText}`);
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
        this.playerHpText.setText(`HP: ${Math.max(0, this.playerHp)}/${this.playerMaxHp}`);
        this.enemyHpText.setText(`${this.enemy.name}: ${Math.max(0, this.enemy.hp)}`);

        // HPに応じて色を変更
        if (this.playerHp < this.playerMaxHp * 0.3) {
            this.playerHpText.setColor('#e94560');
        } else if (this.playerHp < this.playerMaxHp * 0.5) {
            this.playerHpText.setColor('#fbbf24');
        }
    }
}
