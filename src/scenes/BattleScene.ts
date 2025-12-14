/**
 * BattleScene - バトル画面
 * オクトパストラベラー風のターン制バトル（MVP版）
 */

import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "@/config/gameConfig";
import { BATTLE_SYSTEM, BATTLE_UI, PARTY_LAYOUT, ENEMY_LAYOUT, ANIMATION_DURATION } from "@/config/battleConfig";
import { GameStateManager } from "@/managers/GameStateManager";
import {
  WeaknessType,
  TargetScope,
  BattleState,
  BattleCommand,
  PartyMemberBattleData,
  EnemyBattleData,
  TargetSelectionResult,
} from "@/types";
import { ITEMS } from "@/data/items";
import { ABILITIES } from "@/data/abilities";
import { getEnemyData } from "@/data/enemies";
import { calculateDamage } from "@/systems/DamageCalculator";
import { formatWeaknessDisplay } from "@/systems/BattleUtils";
import { drawWindow, drawHpBar, drawAtbBar, drawAtbFrame } from "@/ui/BattleUIHelpers";


export class BattleScene extends Phaser.Scene {
  private enemy!: EnemyBattleData;
  private enemyType: string = "slime"; // 現在の敵タイプ
  private enemySprite!: Phaser.GameObjects.Sprite;
  private returnScene: string = "MapScene";
  private playerPosition: { x: number; y: number } = { x: 0, y: 0 };

  // パーティスプライト（FF6風：右側に斜め配置、最大4人）
  private partySprites: Phaser.GameObjects.Sprite[] = [];
  private partyCount: number = 4; // FF6風4人パーティ

  // パーティメンバーデータ（ATBゲージ含む）
  // 設計書3.5.2: ATB回復速度 = (baseSpeed + characterSpeed) * speedModifier
  // GameStateManagerから取得して設定
  private partyMembers: PartyMemberBattleData[] = [];

  // 現在行動可能なメンバーのインデックス（-1 = 誰も行動可能でない）
  private activePartyMemberIndex: number = -1;

  // ATB設定は config/battleConfig.ts の BATTLE_SYSTEM を使用

  // バトル状態
  private battleState: BattleState = "start";
  private selectedCommand: number = 0;
  private commandPage: "main" | "defend" | "escape" = "main"; // コマンドページ
  private commands: BattleCommand[] = ["attack", "skill", "item"]; // メインコマンド

  // UI要素
  private commandTexts: (
    | Phaser.GameObjects.Text
    | Phaser.GameObjects.Graphics
  )[] = [];
  private enemyNameTexts: Phaser.GameObjects.Text[] = []; // 敵名リスト
  private messageText!: Phaser.GameObjects.Text;
  private playerHpText!: Phaser.GameObjects.Text;
  private enemyHpText!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Text;

  // パーティメンバーのHP表示（4人分）
  private partyHpTexts: Phaser.GameObjects.Text[] = [];
  private partyMpTexts: Phaser.GameObjects.Text[] = []; // MP表示追加
  private partyAtbBars: Phaser.GameObjects.Graphics[] = []; // ATBゲージ

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

  // ATB満タン時刻記録（満タンになった順に行動させるため）
  // 値が小さいほど先に満タンになった = 先に行動する
  private atbFullTimestamps: number[] = []; // 各メンバーがATB満タンになった時刻（0 = まだ満タンでない）
  private frameCounter: number = 0; // フレームカウンター

  // アイテム・スキル選択用
  private tempCommandStack: { state: BattleState, commandPage: string, selected: number }[] = []; // 戻る用スタック
  private selectedItemIndex: number = 0;
  private availableItems: string[] = ['potion', 'high_potion', 'ether']; // MVP用固定アイテムリスト
  private itemWindowGraphics!: Phaser.GameObjects.Graphics;
  private itemTexts: Phaser.GameObjects.Text[] = [];
  private commandWindowGraphics!: Phaser.GameObjects.Graphics; // 追加

  // ターゲット選択用
  private selectedTargetIndex: number = 0; // 0=敵, 0-3=味方
  private targetScope: TargetScope = 'single_enemy'; // 現在選択中のアクションのスコープ
  private currentAction: { type: 'attack' | 'skill' | 'item', id?: string } = { type: 'attack' }; // 実行予定のアクション

  // HPバー（後方互換性のため残す）
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private enemyHpBar!: Phaser.GameObjects.Graphics;
  private playerHpBarBg!: Phaser.GameObjects.Graphics;
  private enemyHpBarBg!: Phaser.GameObjects.Graphics;

  // ATB満タン時の手カーソル（各パーティメンバー用）
  private readyArrows: Phaser.GameObjects.Sprite[] = [];

  // ターゲット選択用手カーソル
  private targetFingerCursor!: Phaser.GameObjects.Sprite;

  constructor() {
    super({ key: "BattleScene" });
  }

  init(data: {
    enemyType?: string;
    returnScene?: string;
    playerPosition?: { x: number; y: number };
  }): void {
    this.enemyType = data.enemyType || "slime";
    this.enemy = getEnemyData(this.enemyType);
    this.returnScene = data.returnScene || "MapScene";
    this.playerPosition = data.playerPosition || { x: 0, y: 0 };

    // ステータスリセット
    this.battleState = "start";
    this.selectedCommand = 0;
    this.activePartyMemberIndex = -1;

    // パーティデータをGameStateManagerから取得
    const globalParty = GameStateManager.getInstance().getParty();
    this.partyMembers = globalParty.map((member) => ({
      name: member.name,
      hp: member.currentHp,
      maxHp: member.currentStats.maxHp,
      mp: member.currentMp, // MP追加
      maxMp: member.currentStats.maxMp, // MaxMP追加
      attack: member.currentStats.attack,
      defense: member.currentStats.defense,
      speed: member.currentStats.speed,
      atb: 0, // ランダムに設定するため一旦0
      maxAtb: 100,
      spriteKey: member.battleSpriteKey,
      isDefending: false,
      weaponType: member.defaultWeapon,
      abilityId: member.abilityId, // アビリティID追加
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

    // ATB満タン時刻記録を初期化
    this.atbFullTimestamps = new Array(this.partyCount).fill(0);
    this.frameCounter = 0;
  }

  create(): void {
    console.log("BattleScene: Creating...");

    this.createBackground();
    this.createEnemySprite();
    this.createEnemyStatusUI(); // 新規追加
    this.createPartySprites(); // FF6風：パーティを右側に配置
    this.createUI();
    this.setupInput();

    // フェードイン後にバトル開始
    this.cameras.main.fadeIn(300);

    this.time.delayedCall(500, () => {
      this.showMessage(`${this.enemy.name}があらわれた！`);
      this.time.delayedCall(1500, () => {
        // waiting状態に遷移し、ATBシステムでターンを管理
        this.battleState = "waiting";
        this.showMessage("");
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
    this.enemySprite = this.add.sprite(enemyX, enemyY, this.enemy.spriteKey);

    // スプライトのスケール（解像度2倍対応：4倍）
    this.enemySprite.setScale(4);

    // アイドルアニメーションを再生
    const animKey = `${this.enemy.spriteKey}-idle`;
    if (this.anims.exists(animKey)) {
      this.enemySprite.play(animKey);
    }

    // 軽い浮遊アニメーション（コウモリはより大きく）（解像度2倍）
    const floatAmount = this.enemyType === "bat" ? 16 : 6;
    this.tweens.add({
      targets: this.enemySprite,
      y: this.enemySprite.y - floatAmount,
      duration: this.enemyType === "bat" ? 600 : 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  /**
   * 敵のステータス表示（シールド、弱点）を作成
   */
  private createEnemyStatusUI(): void {
    const x = this.enemySprite.x;
    const y = this.enemySprite.y + 80;

    // シールドテキスト
    this.enemyShieldText = this.add.text(x, y, "", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "16px",
      color: "#60a5fa", // 青色
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    });
    this.enemyShieldText.setOrigin(0.5);

    // 弱点テキスト
    this.enemyWeaknessText = this.add.text(x, y + 24, "", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "14px",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    });
    this.enemyWeaknessText.setOrigin(0.5);

    // BREAK! テキスト（初期は非表示）
    this.breakText = this.add.text(x, this.enemySprite.y, "BREAK!", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "32px",
      color: "#fbbf24", // 黄色
      stroke: "#000000",
      strokeThickness: 6,
    });
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
      const star = this.add.text(centerX, centerY, "★", {
        fontSize: "24px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 2,
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
          const starAngle = angle + index * 120;
          const rad = Phaser.Math.DegToRad(starAngle);

          star.x = this.enemySprite.x + Math.cos(rad) * radius;
          star.y = this.enemySprite.y - 40 + Math.sin(rad) * (radius * 0.3); // 楕円軌道
          star.setAlpha(0.7 + Math.sin(rad) * 0.3); // 奥に行くと少し薄く
        });
      },
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
      this.enemyShieldText.setText("SHIELD BROKEN!");
      this.enemyShieldText.setColor("#fbbf24"); // 黄色
    } else {
      this.enemyShieldText.setText(`SHIELD: ${this.enemy.shield}`);
      this.enemyShieldText.setColor("#60a5fa"); // 青色
    }

    // 弱点表示（BattleUtils関数を使用）
    const weaknessStr = formatWeaknessDisplay(
      this.enemy.weaknesses,
      this.enemy.revealedWeaknesses
    );
    this.enemyWeaknessText.setText(weaknessStr);
  }

  /**
   * パーティスプライトを作成（FF6風：右側に斜め配置）
   * 1人目が左上で奥、4人目が右下で手前に並ぶ（右下方向への斜め配置）
   */
  private createPartySprites(): void {
    // パーティスプライトをクリア
    this.partySprites.forEach((sprite) => sprite.destroy());
    this.partySprites = [];

    // パーティメンバーの配置（最大4人）（解像度2倍対応）
    // FF6風：1人目が左上で奥、4人目が右下で手前（右下方向への斜め配置）
    const baseX = GAME_WIDTH * 0.62; // 開始位置（左寄り）
    const baseY = GAME_HEIGHT * 0.12; // 開始y位置（上寄り）
    const offsetX = 28; // 各キャラの横オフセット（右へ）（解像度2倍）
    const offsetY = 64; // 各キャラの縦オフセット（下へ）（解像度2倍）

    for (let i = 0; i < this.partyCount; i++) {
      const x = baseX + offsetX * i;
      const y = baseY + offsetY * i;

      // クラスプロパティのpartyMembersから取得
      const member = this.partyMembers[i];
      const sprite = this.add.sprite(x, y, member.spriteKey);
      sprite.setScale(4); // 解像度2倍対応：4倍

      // 深度を設定（1人目=index0が奥=depth低、4人目=index3が手前=depth高）
      // 下にいるキャラほど手前に表示
      sprite.setDepth(70 + i * 10); // 70, 80, 90, 100

      // 待機ポーズ（フレーム0）- 左向きで敵を見据える
      sprite.setFrame(0);

      // 待機モーション（軽い揺れ）（解像度2倍）
      this.tweens.add({
        targets: sprite,
        y: y - 4,
        duration: 800 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.partySprites.push(sprite);
    }
  }

  /**
   * UIを作成（FF6風レイアウト）
   * - 左下: 敵名 + コマンドメニュー
   * - 右: パーティ4人分のステータス
   */
  /**
   * UIを作成（SFC風レイアウト：2ウィンドウ構成）
   * - 左下: 敵名ウィンドウ
   * - 右下: パーティステータスウィンドウ
   * - コマンド: キャラクターの上にポップアップ表示
   */
  private createUI(): void {
    const uiY = GAME_HEIGHT - 150; // UI開始Y位置（下部）
    const windowHeight = 140; // ウィンドウ高さ
    const margin = 10;
    const gap = 4; // ウィンドウ間の隙間

    // ウィンドウ幅の計算 (左35%, 右65%くらい)
    const totalWidth = GAME_WIDTH - margin * 2;
    const enemyWindowWidth = Math.floor(totalWidth * 0.35);
    const partyWindowWidth = totalWidth - enemyWindowWidth - gap;

    // 1. 敵名ウィンドウ (左)
    const enemyWindowX = margin;
    this.drawWindow(enemyWindowX, uiY, enemyWindowWidth, windowHeight);

    // 敵名表示
    this.add.text(enemyWindowX + 20, uiY + 24, this.enemy.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "18px",
      color: "#ffffff",
      shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 0, fill: true },
    });

    // 2. パーティステータスウィンドウ (右)
    const partyWindowX = enemyWindowX + enemyWindowWidth + gap;
    this.drawWindow(partyWindowX, uiY, partyWindowWidth, windowHeight);

    // パーティステータス表示
    this.partyHpTexts = [];
    this.partyAtbBars = [];

    const rowHeight = 32;
    // 各カラムの相対X位置 (レイアウト調整: Name | HP | MP | ATB)
    const nameRelX = 15;
    const hpRelX = 140;
    const mpRelX = 270; // MP表示位置（ATBと被らないように左へ）
    const atbRelX = 350; // 少し右へ
    const atbWidth = 90; // 少し短く

    for (let i = 0; i < this.partyCount; i++) {
      const member = this.partyMembers[i];
      const rowY = uiY + 20 + i * rowHeight;

      // 名前
      this.add.text(partyWindowX + nameRelX, rowY, member.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#e0e0e0",
        shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 0, fill: true },
      });

      // HP (現在値/最大値)
      const hpStr = `${member.hp}/${member.maxHp}`;
      const hpText = this.add.text(partyWindowX + hpRelX, rowY, hpStr, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: "#ffffff",
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 0, fill: true },
      });
      this.partyHpTexts.push(hpText);

      // MP (現在値/最大値)
      const mpStr = `${member.mp}/${member.maxMp}`;
      const mpText = this.add.text(partyWindowX + mpRelX, rowY, mpStr, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "14px",
        color: "#60a5fa", // 青系
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 0, fill: true },
      });
      this.partyMpTexts.push(mpText);

      // ATBゲージ
      const atbAbsX = partyWindowX + atbRelX;

      // 枠 (SFC風: 濃いグレーの背景に明るい枠)
      const atbFrame = this.add.graphics();
      // 背景色（暗い色）
      atbFrame.fillStyle(0x222222, 1);
      atbFrame.fillRoundedRect(atbAbsX, rowY, atbWidth, 10, 4);
      // 枠線（明るいグレー）
      atbFrame.lineStyle(2, 0xaaaaaa, 1);
      atbFrame.strokeRoundedRect(atbAbsX, rowY, atbWidth, 10, 4);

      // ゲージ本体
      const atbBar = this.add.graphics();
      // ゲージ位置も枠内に収めるため調整
      this.drawAtbBar(
        atbBar,
        atbAbsX + 2,
        rowY + 2,
        atbWidth - 4,
        6,
        member.atb,
        member.maxAtb,
      );
      this.partyAtbBars.push(atbBar);
    }

    // 互換性のため
    this.playerHpText = this.partyHpTexts[0];

    // createUIでは初期化のみ

    // ターン数表示
    this.turnText = this.add.text(16, 16, `TURN: ${this.turnCount}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "16px",
      color: "#ffffff",
    });

    // カーソル
    this.cursor = this.add.text(
      0, // 位置はupdateCursorPositionで設定
      0,
      "▶",
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#ffffff",
      },
    );
    this.cursor.setVisible(false); // 初期は非表示

    // ATB満タン時のカーソル（下向き矢印）
    this.readyArrows = [];
    for (let i = 0; i < this.partyCount; i++) {
      const arrow = this.add.sprite(0, 0, 'arrow-down');
      arrow.setOrigin(0.5, 0); // 上端中央を基準に（矢印が下を向く）
      arrow.setScale(2); // 2倍サイズで見やすく
      arrow.setDepth(150);
      arrow.setVisible(false);
      this.readyArrows.push(arrow);
    }

    // ターゲット選択用カーソル（初期テクスチャはhand-cursor、setFlipXやsetOriginは使用時に制御）
    this.targetFingerCursor = this.add.sprite(0, 0, 'hand-cursor');
    this.targetFingerCursor.setScale(2); // 2倍サイズで見やすく
    this.targetFingerCursor.setDepth(400);
    this.targetFingerCursor.setVisible(false);
  }

  /**
   * 標準的な青いウィンドウを描画するヘルパー
   */
  private drawWindow(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Graphics {
    const g = this.add.graphics();

    // 背景
    g.fillStyle(0x000044, 0.9);
    g.fillRect(x, y, width, height);

    // 外枠（白）
    g.lineStyle(4, 0xffffff, 1);
    g.strokeRect(x + 2, y + 2, width - 4, height - 4);

    // 内枠（グレー）
    g.lineStyle(2, 0xaaaaaa, 1);
    g.strokeRect(x + 6, y + 6, width - 12, height - 12);

    return g;
  }

  /**
   * コマンドウィンドウの内容を更新（ポップアップ風）
   * キャラクターの頭上ではなく、SFC版動画では左下にコマンドウィンドウが出る
   * 「たたかう」「ひっさつ」「まほう」「アイテム」などの縦並びウィンドウ
   */
  private updateCommandWindow(): void {
    // 既存のテキストをクリア
    this.commandTexts.forEach((t) => t.destroy());
    this.commandTexts = [];

    // 背景クリア
    if (this.commandWindowGraphics) {
      this.commandWindowGraphics.destroy();
    }

    // コマンドウィンドウ位置：左下の敵名ウィンドウの上に表示
    const margin = 10;
    const uiY = GAME_HEIGHT - 150;

    let cmdX = margin;
    let cmdY = uiY;

    const totalWidth = GAME_WIDTH - 20;
    const enemyWindowWidth = Math.floor(totalWidth * 0.35);

    const cmdWidth = enemyWindowWidth;

    let commandsToShow: string[] = [];

    if (this.commandPage === "main") {
      // アクティブメンバーの固有技名をABILITIESから取得
      let skillName = "とくぎ";
      if (this.activePartyMemberIndex >= 0) {
        const member = this.partyMembers[this.activePartyMemberIndex];
        const ability = ABILITIES[member.abilityId];
        if (ability) {
          skillName = ability.name;
        }
      }
      commandsToShow = ["たたかう", skillName, "アイテム"];
    } else if (this.commandPage === "defend") {
      commandsToShow = ["ぼうぎょ"];
    } else if (this.commandPage === "escape") {
      commandsToShow = ["にげる"];
    }

    // 背景描画
    this.commandWindowGraphics = this.add.graphics();
    this.commandWindowGraphics.fillStyle(0x000044, 0.95);
    this.commandWindowGraphics.fillRect(cmdX, cmdY, cmdWidth, commandsToShow.length * 40 + 20);
    this.commandWindowGraphics.lineStyle(4, 0xffffff, 1);
    this.commandWindowGraphics.strokeRect(
      cmdX + 2,
      cmdY + 2,
      cmdWidth - 4,
      commandsToShow.length * 40 + 16,
    );
    this.commandWindowGraphics.setDepth(190);

    // コマンドテキスト生成
    commandsToShow.forEach((label, index) => {
      const text = this.add.text(cmdX + 30, cmdY + 20 + index * 36, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: "#ffffff",
        shadow: { offsetX: 1, offsetY: 1, color: "#000", blur: 0, fill: true },
      });
      text.setDepth(200);
      this.commandTexts.push(text);
    });
  }

  /**
   * コマンドカーソル位置更新
   */
  private updateCursorPosition(): void {
    const margin = 10;
    const uiY = GAME_HEIGHT - 150;

    const cmdX = margin;
    const cmdY = uiY;
    const lineHeight = 36;

    // 項目数チェック
    const maxIndex = this.commandTexts.length - 1;
    if (this.selectedCommand > maxIndex) this.selectedCommand = maxIndex;
    // マイナス対策
    if (this.selectedCommand < 0) this.selectedCommand = 0;

    // カーソル
    this.cursor.setX(cmdX + 10);
    this.cursor.setY(cmdY + 20 + this.selectedCommand * lineHeight);
    this.cursor.setDepth(201);
    this.cursor.setText("▶");
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
    isEnemy: boolean = false,
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
    max: number,
  ): void {
    graphics.clear();

    graphics.clear();

    const ratio = Math.max(0, Math.min(1, current / max));
    const barWidth = width * ratio;

    // ATBゲージの色（SFC風：通常は茶色っぽいオレンジ、満タンに近いと黄色/白っぽく光る）
    // 参考画像を見ると、満タン時は黄色で、溜まっている途中は少し暗い色、基本は白っぽい？
    // 動画のアルテマウェポン戦を見ると、溜まる途中は「白/薄いグレー」で、満タンになると「黄色/オレンジ」に点滅しているように見える
    // 別の画像では茶色ベースに黄色い線。
    // ここでは「溜め途中：白」「満タン：黄色」として実装する

    const isFull = ratio >= 1;
    const baseColor = isFull ? 0xffcc00 : 0xffffff; // 満タン: 黄色, 途中: 白
    const glowColor = isFull ? 0xffffaa : 0xaaaaaa;

    if (barWidth > 0) {
      // ゲージ本体
      graphics.fillStyle(baseColor, 1);
      graphics.fillRect(x, y, barWidth, height);

      // 中心に光沢ラインを入れる（より細く）
      graphics.fillStyle(glowColor, 0.8);
      graphics.fillRect(x, y + height / 2 - 1, barWidth, 2);
    }
  }

  /**
   * 指定メンバーのATBバーを更新するヘルパー
   */
  private updateAtbBarForMember(memberIndex: number): void {
    const margin = 10;
    const uiY = GAME_HEIGHT - 150;
    const gap = 4;
    const totalWidth = GAME_WIDTH - margin * 2;
    const enemyWindowWidth = Math.floor(totalWidth * 0.35);
    const partyWindowX = margin + enemyWindowWidth + gap;
    const atbRelX = 350;
    const atbWidth = 90;
    const rowHeight = 32;

    const member = this.partyMembers[memberIndex];
    const rowY = uiY + 20 + memberIndex * rowHeight;
    const atbAbsX = partyWindowX + atbRelX;

    this.drawAtbBar(
      this.partyAtbBars[memberIndex],
      atbAbsX + 2,
      rowY + 2, // 枠内に収める（枠はrowYから開始）
      atbWidth - 4,
      6,
      member.atb,
      member.maxAtb,
    );
  }

  /**
   * コマンドの表示/非表示
   */
  private setCommandVisible(visible: boolean): void {
    this.commandTexts.forEach((text) => {
      text.setVisible(visible);
    });

    if (this.commandWindowGraphics) {
      this.commandWindowGraphics.setVisible(visible);
    }

    if (!visible) {
      // 非表示時
    } else {
      // 表示時は再描画
      this.updateCommandWindow();
    }

    this.cursor.setVisible(visible);
  }

  /**
   * 入力のセットアップ
   */
  private setupInput(): void {
    const handleKey = (key: string) => this.handleInput(key);

    this.input.keyboard?.on("keydown-UP", () => handleKey('UP'));
    this.input.keyboard?.on("keydown-DOWN", () => handleKey('DOWN'));
    this.input.keyboard?.on("keydown-LEFT", () => handleKey('LEFT'));
    this.input.keyboard?.on("keydown-RIGHT", () => handleKey('RIGHT'));
    this.input.keyboard?.on("keydown-W", () => handleKey('UP'));
    this.input.keyboard?.on("keydown-S", () => handleKey('DOWN'));
    this.input.keyboard?.on("keydown-A", () => handleKey('LEFT'));
    this.input.keyboard?.on("keydown-D", () => handleKey('RIGHT'));

    this.input.keyboard?.on("keydown-SPACE", () => handleKey('OK'));
    this.input.keyboard?.on("keydown-ENTER", () => handleKey('OK'));
    this.input.keyboard?.on("keydown-Z", () => handleKey('OK'));

    this.input.keyboard?.on("keydown-ESC", () => handleKey('CANCEL'));
    this.input.keyboard?.on("keydown-X", () => handleKey('CANCEL'));
  }

  /**
   * 入力ハンドリング
   */
  private handleInput(key: string): void {
    // リザルト画面表示中はSPACE/ENTERで閉じる
    if (this.resultWaitingForInput) {
      if (key === 'OK') {
        this.closeResultScreen();
      }
      return;
    }

    if (this.battleState === 'playerTurn') {
      if (key === 'UP') this.moveCommand(-1);
      if (key === 'DOWN') this.moveCommand(1);
      if (key === 'LEFT') this.switchCommandPage("left");
      if (key === 'RIGHT') this.switchCommandPage("right");
      if (key === 'OK') this.selectCommand();
    } else if (this.battleState === 'selectItem') {
      if (key === 'UP') this.moveItemCursor(-1);
      if (key === 'DOWN') this.moveItemCursor(1);
      if (key === 'OK') this.selectItem();
      if (key === 'CANCEL') this.cancelItemSelection();
    } else if (this.battleState === 'selectTarget') {
      if (key === 'UP') this.moveTargetCursor(-1);
      if (key === 'DOWN') this.moveTargetCursor(1);
      if (key === 'OK') this.decideTarget();
      if (key === 'CANCEL') this.cancelTargetSelection();
    }
  }

  // --- アイテム選択操作 ---

  private moveItemCursor(direction: number): void {
    this.selectedItemIndex += direction;
    if (this.selectedItemIndex < 0) this.selectedItemIndex = this.availableItems.length - 1;
    if (this.selectedItemIndex >= this.availableItems.length) this.selectedItemIndex = 0;
    this.updateItemWindow();
  }

  private selectItem(): void {
    const itemId = this.availableItems[this.selectedItemIndex];
    const item = ITEMS[itemId];

    this.currentAction = { type: 'item', id: itemId };
    this.targetScope = item.targetScope || 'single_ally';
    this.enterTargetSelection();

    // アイテムウィンドウを隠す
    this.itemWindowGraphics.setVisible(false);
    this.itemTexts.forEach(t => t.setVisible(false));
  }

  private cancelItemSelection(): void {
    // アイテムウィンドウ破棄
    if (this.itemWindowGraphics) this.itemWindowGraphics.destroy();
    this.itemTexts.forEach(t => t.destroy());
    this.itemTexts = [];

    // コマンド選択に戻る
    this.battleState = 'playerTurn';
    this.setCommandVisible(true);
  }

  // --- ターゲット選択操作 ---

  private moveTargetCursor(direction: number): void {
    if (this.targetScope === 'single_ally') {
      this.selectedTargetIndex += direction;
      // パーティ人数でループ
      if (this.selectedTargetIndex < 0) this.selectedTargetIndex = this.partyCount - 1;
      if (this.selectedTargetIndex >= this.partyCount) this.selectedTargetIndex = 0;
      this.updateTargetCursor();
    }
    // 敵単体の場合は移動なし（MVPは敵1体）
  }

  private decideTarget(): void {
    // 指カーソル非表示
    this.hideTargetCursor();
    // アクション実行へ
    this.executeAction();
  }

  private cancelTargetSelection(): void {
    // 指カーソル非表示
    this.hideTargetCursor();
    this.cursor.setVisible(false);

    if (this.currentAction.type === 'item') {
      // アイテム選択に戻る
      this.battleState = 'selectItem';
      this.itemWindowGraphics.setVisible(true);
      this.itemTexts.forEach(t => t.setVisible(true));
    } else {
      // コマンド選択に戻る (Attack, Skill)
      this.battleState = 'playerTurn';
      this.setCommandVisible(true);
    }
  }

  private switchCommandPage(direction: "left" | "right"): void {
    if (this.battleState !== "playerTurn") return;

    if (direction === "right") {
      if (this.commandPage === "main") {
        this.commandPage = "defend";
      } else if (this.commandPage === "defend") {
        return; // 右端
      } else if (this.commandPage === "escape") {
        this.commandPage = "main";
      }
    } else {
      // left
      if (this.commandPage === "main") {
        this.commandPage = "escape";
      } else if (this.commandPage === "escape") {
        return; // 左端
      } else if (this.commandPage === "defend") {
        this.commandPage = "main";
      }
    }

    this.selectedCommand = 0;
    this.updateCommandWindow();
    this.updateCursorPosition();
  }

  /**
   * コマンドを移動
   */
  private moveCommand(direction: number): void {
    if (this.battleState !== "playerTurn") return;

    this.selectedCommand += direction;

    // ページ項目数による循環
    const max = this.commandTexts.length;
    if (this.selectedCommand < 0) {
      this.selectedCommand = max - 1;
    } else if (this.selectedCommand >= max) {
      this.selectedCommand = 0;
    }

    this.updateCursorPosition();
  }

  /**
   * コマンドを選択
   */
  private selectCommand(): void {
    if (this.battleState !== "playerTurn") return;

    let command: BattleCommand | null = null;

    if (this.commandPage === "main") {
      command = this.commands[this.selectedCommand];
    } else if (this.commandPage === "defend") {
      command = "defend";
    } else if (this.commandPage === "escape") {
      command = "escape";
    }

    if (!command) return;

    this.setCommandVisible(false);

    // 行動実行中状態への移行は各メソッド（enterTargetSelectionなど）に任せる
    // this.battleState = "executing"; 

    switch (command) {
      case "attack":
        // 攻撃：ターゲット選択へ（敵単体）
        this.currentAction = { type: 'attack' };
        this.targetScope = 'single_enemy';
        this.enterTargetSelection();
        break;
      case "skill":
        // スキル：MPチェック後にターゲット選択へ
        const activeMember = this.partyMembers[this.activePartyMemberIndex];
        const ability = ABILITIES[activeMember.abilityId];

        if (!ability) {
          this.showMessage("スキルデータがありません");
          return;
        }

        if (activeMember.mp < ability.mpCost) {
          this.showMessage("MPがたりない！");
          // 画面中央に大きく表示
          this.showSkillAnnouncement("MPがたりない！");
          this.time.delayedCall(1000, () => this.showMessage(""));
          // 選択状態に戻る（waitingには戻さない）
          this.setCommandVisible(true);
          this.battleState = 'playerTurn';
          return;
        }

        this.currentAction = { type: 'skill', id: activeMember.abilityId };
        this.targetScope = ability.targetScope;
        this.enterTargetSelection();
        break;
      case "item":
        // アイテム：アイテム選択へ
        this.enterItemSelection();
        break;
      case "defend":
        this.playerDefendAction();
        break;
      case "escape":
        this.playerEscapeAction();
        break;
    }
  }

  /**
   * アイテム選択モードへ遷移
   */
  private enterItemSelection(): void {
    this.battleState = "selectItem";
    this.selectedItemIndex = 0;

    // アイテムウィンドウを表示
    this.createItemWindow();
  }

  /**
   * アイテムウィンドウ作成・表示（中央オーバーレイ）
   */
  private createItemWindow(): void {
    const windowWidth = 280;
    const windowHeight = 140;
    const x = (GAME_WIDTH - windowWidth) / 2;
    const y = (GAME_HEIGHT - windowHeight) / 2;

    this.itemWindowGraphics = this.drawWindow(x, y, windowWidth, windowHeight);
    this.itemWindowGraphics.setDepth(300);

    // アイテムリスト描画
    this.updateItemWindow();
  }

  /**
   * アイテムリスト更新（1列表示、大きめフォント）
   */
  private updateItemWindow(): void {
    // 古いテキストを削除
    this.itemTexts.forEach(t => t.destroy());
    this.itemTexts = [];

    const windowWidth = 280;
    const windowHeight = 140;
    const startX = (GAME_WIDTH - windowWidth) / 2 + 30;
    const startY = (GAME_HEIGHT - windowHeight) / 2 + 25;
    const rowHeight = 32;

    this.availableItems.forEach((itemId, index) => {
      const item = ITEMS[itemId];
      const y = startY + index * rowHeight;

      const isSelected = index === this.selectedItemIndex;
      const color = isSelected ? '#fbbf24' : '#ffffff';
      const prefix = isSelected ? '▶ ' : '   ';

      // アイテム名と個数
      const text = this.add.text(startX, y, `${prefix}${item.name}：1`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color: color
      });
      text.setDepth(301);
      this.itemTexts.push(text);
    });
  }

  /**
   * ターゲット選択モードへ遷移
   */
  private enterTargetSelection(): void {
    this.battleState = "selectTarget";

    // 初期ターゲット設定
    if (this.targetScope === 'single_enemy') {
      this.selectedTargetIndex = 0; // 敵は1体のみなので0固定
      // 敵カーソル表示
      this.updateTargetCursor();
    } else if (this.targetScope === 'single_ally') {
      this.selectedTargetIndex = this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0;
      // 味方カーソル表示
      this.updateTargetCursor();
    } else if (this.targetScope === 'all_allies' || this.targetScope === 'all_enemies') {
      // 全体対象
      this.updateTargetCursor();
    }
  }

  /**
   * ターゲットカーソル更新（FF6風：対象の横に手カーソル）
   */
  private updateTargetCursor(): void {
    // 既存のカーソルを非表示
    this.cursor.setVisible(false);

    if (this.targetScope === 'single_enemy') {
      // 敵の右側に左向き手カーソルを表示（指が敵を指す）
      if (this.enemySprite) {
        this.targetFingerCursor.setTexture('hand-cursor');
        this.targetFingerCursor.setFlipX(true); // 反転して左向きに
        this.targetFingerCursor.setOrigin(0, 0.5); // 左端（指先）を基準に
        this.targetFingerCursor.setPosition(
          this.enemySprite.x + this.enemySprite.width / 2 + 50,
          this.enemySprite.y
        );
        this.targetFingerCursor.setVisible(true);
      }
    } else if (this.targetScope === 'single_ally') {
      // 選択中の味方スプライトの左側に右向き手カーソルを表示（指が味方を指す）
      const targetSprite = this.partySprites[this.selectedTargetIndex];
      if (targetSprite) {
        this.targetFingerCursor.setTexture('hand-cursor');
        this.targetFingerCursor.setFlipX(false); // 通常（右向き）
        this.targetFingerCursor.setOrigin(1, 0.5); // 右端（指先）を基準に
        this.targetFingerCursor.setPosition(
          targetSprite.x - targetSprite.width / 2 - 5,
          targetSprite.y - targetSprite.height / 2
        );
        this.targetFingerCursor.setVisible(true);
      }
    } else if (this.targetScope === 'all_allies') {
      // 味方全体の場合は全員のキャラの左側に矢印を表示
      this.targetFingerCursor.setVisible(false); // メインカーソルは非表示

      // 生存している全パーティメンバーに矢印を表示
      for (let i = 0; i < this.partySprites.length; i++) {
        const sprite = this.partySprites[i];
        const member = this.partyMembers[i];
        if (sprite && member && member.hp > 0 && this.readyArrows[i]) {
          // readyArrows を一時的にターゲットカーソルとして使用
          this.readyArrows[i].setTexture('hand-cursor');
          this.readyArrows[i].setFlipX(false);
          this.readyArrows[i].setOrigin(1, 0.5);
          this.readyArrows[i].setPosition(
            sprite.x - 30,  // キャラの左側（くちばしの前）
            sprite.y - 0    // キャラより少し下（くちばし高さ）
          );
          this.readyArrows[i].setVisible(true);
          this.readyArrows[i].setScale(2);
        }
      }
    }
  }

  /**
   * ターゲットカーソルを非表示にする
   */
  private hideTargetCursor(): void {
    this.targetFingerCursor.setVisible(false);

    // all_allies用に表示していた矢印も非表示に（元のテクスチャに戻す）
    for (let i = 0; i < this.readyArrows.length; i++) {
      if (this.readyArrows[i]) {
        this.readyArrows[i].setTexture('arrow-down');
        this.readyArrows[i].setOrigin(0.5, 0); // 元の設定に戻す
        this.readyArrows[i].setScale(2); // 元のスケールに戻す
        this.readyArrows[i].setVisible(false);
      }
    }
  }

  /**
   * プレイヤーターン開始
   */
  private startPlayerTurn(): void {
    this.battleState = "playerTurn";

    // このメンバーを行動済みに記録
    if (this.activePartyMemberIndex >= 0) {
      this.actedPartyMemberIndices.add(this.activePartyMemberIndex);
      // ATB満タン時刻をリセット（次回ゲージ満タン時に新しいタイムスタンプが付く）
      this.atbFullTimestamps[this.activePartyMemberIndex] = 0;
    }

    // アクティブメンバーの防御フラグをリセット
    const activeMember =
      this.partyMembers[
      this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0
      ];
    activeMember.isDefending = false;

    // コマンドウィンドウ更新
    this.commandPage = "main";
    this.updateCommandWindow();

    // ターン開始メッセージは出さない（SFC版準拠）
    // this.showMessage(`${activeMember.name}のターン！`);
    this.setCommandVisible(true);
    this.selectedCommand = 0;
    this.updateCursorPosition();
  }

  /**
   * プレイヤーの攻撃
   */
  private playerAttackAction(): void {
    const idx =
      this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0;
    const activeMember = this.partyMembers[idx];

    // ATBを0にリセット
    activeMember.atb = 0;

    // ATBバーを更新（座標をcreateUI/updateと統一）
    const margin = 10;
    const uiY = GAME_HEIGHT - 150;
    const gap = 4;
    const totalWidth = GAME_WIDTH - margin * 2;
    const enemyWindowWidth = Math.floor(totalWidth * 0.35);
    const partyWindowX = margin + enemyWindowWidth + gap;
    const atbRelX = 350;
    const atbWidth = 90;
    const rowHeight = 32;

    const rowY = uiY + 20 + idx * rowHeight;
    const atbAbsX = partyWindowX + atbRelX;

    this.drawAtbBar(
      this.partyAtbBars[idx],
      atbAbsX + 2,
      rowY + 12,
      atbWidth - 4,
      6,
      0,
      activeMember.maxAtb,
    );

    // 弱点チェックとシールド処理
    let weaknessMultiplier = 1.0;
    let isShieldBrokenNow = false;

    // メンバーの武器属性が弱点かチェック
    const weaknessIndex = this.enemy.weaknesses.indexOf(
      activeMember.weaponType,
    );
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
    const { damage, isCritical } = calculateDamage({
      attack: activeMember.attack,
      defense: this.enemy.defense,
      isDefending: false,
      weaknessMultiplier,
      isBroken: this.enemy.isBroken,
    });

    // パーティメンバーを攻撃ポーズに切り替え
    const sprite = this.partySprites[idx];

    // 攻撃ポーズに変更
    sprite.setFrame(1);

    // 前に踏み込むアニメーション
    const originalX = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: sprite.x - 60, // 敵に向かって踏み込む（解像度2倍）
      duration: 150,
      ease: "Power2",
      onComplete: () => {
        // 元の位置に戻る
        this.tweens.add({
          targets: sprite,
          x: originalX,
          duration: 200,
          ease: "Power2",
          onComplete: () => {
            // 待機ポーズに戻す
            sprite.setFrame(0);
          },
        });
      },
    });

    this.enemy.hp -= damage;

    // 敵が揺れる（クリティカル時は激しく）- 少し遅延してから
    this.time.delayedCall(150, () => {
      this.tweens.add({
        targets: this.enemySprite,
        x: this.enemySprite.x + (isCritical ? 40 : 20), // 解像度2倍
        duration: isCritical ? 30 : 50,
        yoyo: true,
        repeat: isCritical ? 5 : 3,
      });

      // ダメージポップアップ
      this.showDamagePopup(
        this.enemySprite.x,
        this.enemySprite.y - 60, // 解像度2倍
        damage,
        isCritical,
        weaknessMultiplier > 1.0,
      );

      // ブレイク演出
      if (isShieldBrokenNow) {
        this.showBreakEffect();
      }

      // ステータス表示更新
      this.updateEnemyStatusDisplay();
    });

    // メッセージ
    const critText = isCritical ? "クリティカル！ " : "";
    const weakText = weaknessMultiplier > 1.0 ? "じゃくてん！ " : "";
    this.showMessage(
      `${critText}${weakText}${this.enemy.name}に${damage}のダメージ！`,
    );
    this.updateHpDisplay();

    this.time.delayedCall(1500, () => {
      if (this.enemy.hp <= 0) {
        this.victory();
      } else {
        // waiting状態に戻り、ATBで次のターンを判定
        this.battleState = "waiting";
        this.showMessage("");
      }
    });
  }

  /**
   * プレイヤーの防御
   */
  private playerDefendAction(): void {
    // アクティブメンバーの防御フラグをオン
    const activeMember =
      this.partyMembers[
      this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0
      ];
    activeMember.isDefending = true;
    activeMember.atb = 0;
    this.showMessage(`${activeMember.name}はみをまもっている...`);

    this.time.delayedCall(1000, () => {
      // waiting状態に戻る
      this.battleState = "waiting";
      this.showMessage("");
    });
  }

  /**
   * プレイヤーの逃走
   */
  private playerEscapeAction(): void {
    // アクティブメンバーのATBをリセット
    const activeMember =
      this.partyMembers[
      this.activePartyMemberIndex >= 0 ? this.activePartyMemberIndex : 0
      ];
    activeMember.atb = 0;

    // 50%の確率で逃げられる
    if (Phaser.Math.Between(1, 100) <= 50) {
      this.showMessage("うまく にげきれた！");
      this.battleState = "escaped";

      this.time.delayedCall(1500, () => {
        this.endBattle();
      });
    } else {
      this.showMessage("にげられなかった！");

      this.time.delayedCall(1000, () => {
        // waiting状態に戻る
        this.battleState = "waiting";
        this.showMessage("");
      });
    }
  }

  /**
   * 敵ターン
   */
  private startEnemyTurn(): void {
    this.battleState = "enemyTurn";

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
        this.battleState = "waiting";
        this.showMessage("");
      });
      return;
    }

    // 生存メンバーからランダムにターゲットを選択
    const aliveMembers = this.partyMembers
      .map((member, index) => ({ member, index }))
      .filter((item) => item.member.hp > 0);

    if (aliveMembers.length === 0) {
      this.defeat();
      return;
    }

    const targetData =
      aliveMembers[Phaser.Math.Between(0, aliveMembers.length - 1)];
    const targetMember = targetData.member;
    const targetSprite = this.partySprites[targetData.index];

    // ダメージ計算（改善版）
    const { damage, isCritical } = calculateDamage({
      attack: this.enemy.attack,
      defense: targetMember.defense,
      isDefending: targetMember.isDefending,
    });

    targetMember.hp -= damage;

    // ターゲットのみダメージポーズとアニメーション
    targetSprite.setFrame(2); // ダメージポーズ

    // 後ろに仰け反るアニメーション
    this.tweens.add({
      targets: targetSprite,
      x: targetSprite.x + 30, // 後ろに仰け反る（解像度2倍）
      duration: 100,
      ease: "Power2",
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
      },
    });

    // プレイヤーのダメージエフェクト（画面揺れ）
    const shakeIntensity = isCritical ? 0.02 : 0.01;
    this.cameras.main.shake(isCritical ? 200 : 100, shakeIntensity);

    // ダメージポップアップ（ターゲット付近）
    this.showDamagePopup(
      targetSprite.x,
      targetSprite.y - 60, // 解像度2倍
      damage,
      isCritical,
    );

    // メッセージ
    const critText = isCritical ? "クリティカル！ " : "";
    const defenseText = targetMember.isDefending ? "（ぼうぎょ中）" : "";
    this.showMessage(
      `${this.enemy.name}のこうげき！\n${targetMember.name}に${damage}のダメージ！${defenseText}`,
    );
    this.updateHpDisplay();

    this.time.delayedCall(2000, () => {
      // パーティ全滅チェック（全員のHPが0以下）
      const allDead = this.partyMembers.every((m) => m.hp <= 0);
      if (allDead) {
        this.defeat();
      } else {
        // waiting状態に戻り、ATBで次のターンを判定
        this.battleState = "waiting";
        this.showMessage("");
      }
    });
  }

  /**
   * 勝利
   */
  private victory(): void {
    this.battleState = "victory";

    // ブレイクエフェクトを消す
    this.breakText.setVisible(false);
    this.stunStars.forEach((star) => star.setVisible(false));
    if (this.stunTween) {
      this.stunTween.stop();
    }

    // シールドと弱点テキストも消す
    this.enemyShieldText.setVisible(false);
    this.enemyWeaknessText.setVisible(false);

    // 敵の消滅アニメーション
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0,
      scaleX: 0,
      scaleY: 0,
      duration: 500,
      ease: "Power2",
    });

    // 経験値獲得
    const expReward = this.enemy.expReward || 10; // fallback

    this.showMessage(`${this.enemy.name}をたおした！`);

    // 経験値付与とリザルト画面表示
    this.time.delayedCall(1500, () => {
      this.processExperienceAndShowResult(expReward);
    });
  }

  // リザルト画面用のUI要素
  private resultWindowGraphics: Phaser.GameObjects.Graphics | null = null;
  private resultTexts: Phaser.GameObjects.Text[] = [];
  private resultWaitingForInput: boolean = false;

  /**
   * 経験値付与とリザルト画面表示
   */
  private processExperienceAndShowResult(expReward: number): void {
    // ローカルのパーティメンバー状態をグローバルに反映（HP/MPなど）
    const globalParty = GameStateManager.getInstance().getParty();
    this.partyMembers.forEach((localMember, index) => {
      if (globalParty[index]) {
        globalParty[index].currentHp = localMember.hp;
        globalParty[index].currentMp = localMember.mp;
        globalParty[index].isDead = localMember.hp <= 0;
      }
    });

    // 経験値付与前のレベルを保存
    const preLevels = globalParty.map(m => m.currentStats.level);

    // 経験値付与
    const expResults = GameStateManager.getInstance().awardExperience(expReward);

    // リザルト画面を表示
    this.showResultScreen(expReward, expResults, preLevels);
  }

  /**
   * FF6風リザルト画面を表示
   */
  private showResultScreen(
    expReward: number,
    expResults: { memberId: string; memberName: string; expGained: number; levelUpResult: { newLevel: number; statGains: { hp: number; mp: number; attack: number; defense: number; speed: number } } | null }[],
    preLevels: number[]
  ): void {
    // メッセージを非表示
    this.showMessage("");

    // リザルトウィンドウの位置とサイズ
    const windowWidth = 420;
    const windowHeight = 210;  // 高さを増やしてたいさまで収まるように
    const windowX = (GAME_WIDTH - windowWidth) / 2;
    const windowY = (GAME_HEIGHT - windowHeight) / 2;

    // ウィンドウ背景を描画
    this.resultWindowGraphics = this.add.graphics();
    this.resultWindowGraphics.setDepth(500);

    // 外枠（白）
    this.resultWindowGraphics.fillStyle(0xffffff, 1);
    this.resultWindowGraphics.fillRoundedRect(windowX - 2, windowY - 2, windowWidth + 4, windowHeight + 4, 4);

    // 背景（青グラデーション風）
    this.resultWindowGraphics.fillStyle(0x1a1a4e, 1);
    this.resultWindowGraphics.fillRoundedRect(windowX, windowY, windowWidth, windowHeight, 4);

    // 内側の区切り線（4人分のキャラが入るように高さを調整）
    this.resultWindowGraphics.lineStyle(2, 0xffffff, 0.5);
    this.resultWindowGraphics.strokeRect(windowX + 10, windowY + 40, windowWidth - 20, windowHeight - 70);

    const textStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "12px",
      color: "#ffffff",
    };

    const labelStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "10px",
      color: "#aaaaaa",
    };

    const levelUpStyle = {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "12px",
      color: "#ffff00", // 黄色
    };

    // ヘッダー: 獲得経験値
    const headerText = this.add.text(
      windowX + 20,
      windowY + 15,
      `獲得経験値`,
      labelStyle
    );
    headerText.setDepth(501);
    this.resultTexts.push(headerText);

    const expValueText = this.add.text(
      windowX + 150,
      windowY + 12,
      `${expReward}`,
      textStyle
    );
    expValueText.setDepth(501);
    this.resultTexts.push(expValueText);

    // カラムヘッダー
    const colHeaderExp = this.add.text(windowX + 160, windowY + 45, "経験値", labelStyle);
    colHeaderExp.setDepth(501);
    this.resultTexts.push(colHeaderExp);

    const colHeaderNext = this.add.text(windowX + 310, windowY + 45, "NEXT", labelStyle);
    colHeaderNext.setDepth(501);
    this.resultTexts.push(colHeaderNext);

    // 各キャラクターの情報
    const globalParty = GameStateManager.getInstance().getParty();
    const rowHeight = 26;
    const startY = windowY + 65;

    expResults.forEach((result, index) => {
      const y = startY + index * rowHeight;
      const member = globalParty[index];

      // 戦闘不能は暗く表示
      const isDead = result.expGained === 0;
      const nameColor = isDead ? "#666666" : "#ffffff";
      const valueColor = isDead ? "#666666" : "#ffffff";

      // キャラ名
      const nameText = this.add.text(
        windowX + 20,
        y,
        result.memberName,
        { ...textStyle, color: nameColor }
      );
      nameText.setDepth(501);
      this.resultTexts.push(nameText);

      // 現在経験値
      const currentExp = member.currentStats.exp;
      const expText = this.add.text(
        windowX + 160,
        y,
        isDead ? "---" : `${currentExp}`,
        { ...textStyle, color: valueColor }
      );
      expText.setDepth(501);
      this.resultTexts.push(expText);

      // NEXT または LEVEL UP
      if (result.levelUpResult) {
        // レベルアップした！
        const levelUpText = this.add.text(
          windowX + 290,
          y,
          "LEVEL UP",
          levelUpStyle
        );
        levelUpText.setDepth(501);
        this.resultTexts.push(levelUpText);

        // 点滅アニメーション
        this.tweens.add({
          targets: levelUpText,
          alpha: 0.3,
          duration: 400,
          yoyo: true,
          repeat: -1
        });
      } else {
        // 次のレベルまでの経験値
        const { getExpToNextLevel } = require('@/systems/LevelUpSystem');
        const nextExp = getExpToNextLevel(member.currentStats.level, member.currentStats.exp);
        const nextText = this.add.text(
          windowX + 310,
          y,
          isDead ? "---" : `${nextExp}`,
          { ...textStyle, color: valueColor }
        );
        nextText.setDepth(501);
        this.resultTexts.push(nextText);
      }
    });

    // 「Press any key to continue」表示
    const continueText = this.add.text(
      GAME_WIDTH / 2,
      windowY + windowHeight - 15,
      "Press SPACE to continue",
      { ...labelStyle, fontSize: "8px" }
    );
    continueText.setOrigin(0.5);
    continueText.setDepth(501);
    this.resultTexts.push(continueText);

    // 点滅
    this.tweens.add({
      targets: continueText,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });

    // レベルアップしたメンバーがいたら画面フラッシュ
    const hasLevelUp = expResults.some(r => r.levelUpResult !== null);
    if (hasLevelUp) {
      this.cameras.main.flash(300, 255, 255, 200);
    }

    // 入力待ちフラグ
    this.resultWaitingForInput = true;
  }

  /**
   * リザルト画面を閉じてバトル終了
   */
  private closeResultScreen(): void {
    if (!this.resultWaitingForInput) return;

    this.resultWaitingForInput = false;

    // UIをクリーンアップ
    if (this.resultWindowGraphics) {
      this.resultWindowGraphics.destroy();
      this.resultWindowGraphics = null;
    }
    this.resultTexts.forEach(t => t.destroy());
    this.resultTexts = [];

    // バトル終了
    this.endBattle();
  }


  /**
   * 敗北
   */
  private defeat(): void {
    this.battleState = "defeat";
    this.showMessage("ぜんめつ...");

    this.cameras.main.fadeOut(2000, 255, 0, 0);

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("TitleScene");
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
        globalParty[index].currentMp = localMember.mp; // MPも保存
        // 戦闘不能状態の更新
        globalParty[index].isDead = localMember.hp <= 0;
      }
    });

    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start(this.returnScene, {
        playerPosition: this.playerPosition,
      });
    });
  }

  /**
   * メッセージを表示
   */
  private showMessage(text: string): void {
    if (this.messageText) {
      this.messageText.setText(text);
      this.messageText.setVisible(!!text); // テキストがある時だけ表示
    }
  }

  /**
   * 特技名を画面上中央に大きく表示（FF6風）
   */
  private showSkillAnnouncement(skillName: string): void {
    const announcement = this.add.text(
      GAME_WIDTH / 2,
      60,
      skillName,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "24px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: { offsetX: 2, offsetY: 2, color: "#000", blur: 0, fill: true },
      }
    );
    announcement.setOrigin(0.5);
    announcement.setDepth(500);
    announcement.setAlpha(0);

    // フェードインしてしばらく表示後フェードアウト
    this.tweens.add({
      targets: announcement,
      alpha: 1,
      y: 50,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: announcement,
            alpha: 0,
            y: 40,
            duration: 300,
            ease: "Power2",
            onComplete: () => {
              announcement.destroy();
            }
          });
        });
      }
    });
  }

  /**
   * HP/MP表示を更新
   */
  private updateHpDisplay(): void {
    // HP/MP テキスト更新
    for (let i = 0; i < this.partyCount; i++) {
      const member = this.partyMembers[i];
      if (!member) continue;

      // HP更新
      const hpText = this.partyHpTexts[i];
      if (hpText && hpText.active) {
        const hpStr = `${member.hp}/${member.maxHp}`;
        hpText.setText(hpStr);
      }

      // MP更新
      const mpText = this.partyMpTexts[i];
      if (mpText && mpText.active) {
        const mpStr = `${member.mp}/${member.maxMp}`;
        mpText.setText(mpStr);
      }
    }
  }

  /**
   * アクション実行
   */
  private executeAction(): void {
    this.cursor.setVisible(false);
    this.battleState = "executing";

    const action = this.currentAction;

    if (action.type === 'attack') {
      this.playerAttackAction();
    } else if (action.type === 'skill' && action.id) {
      this.executeSkill(action.id);
    } else if (action.type === 'item' && action.id) {
      this.executeItem(action.id);
    }
  }

  /**
   * スキル実行
   */
  private executeSkill(skillId: string): void {
    const idx = this.activePartyMemberIndex;
    const activeMember = this.partyMembers[idx];
    const ability = ABILITIES[skillId];

    if (!ability) return;

    // MP消費
    activeMember.mp -= ability.mpCost;

    // ATBを0にリセット
    activeMember.atb = 0;
    this.updateAtbBarForMember(idx);

    // メッセージ表示
    this.showMessage(`${activeMember.name}の ${ability.name}！`);

    // 画面上中央に特技名を大きく表示
    this.showSkillAnnouncement(ability.name);

    // スキル用モーション（とりあえず攻撃と同じ）
    const sprite = this.partySprites[idx];
    this.tweens.add({
      targets: sprite,
      x: sprite.x - 40,
      duration: 200,
      yoyo: true,
      ease: "Power2"
    });

    // 効果発動までの遅延
    this.time.delayedCall(800, () => {
      if (ability.targetScope === 'single_enemy') {
        // 敵単体攻撃
        let multiplier = ability.power || 1.0;
        let isCrit = ability.isCritical || false;
        let shieldDmg = ability.shieldDamage || 0;

        // 基本ダメージ計算処理を使い回すために補正
        // ability.powerが補正値。calculateDamageは攻撃力と防御力から計算。
        // ここでは簡易的に、ダメージ計算後に倍率をかける形にするか、攻撃力を上げるか。
        // calculateDamageに倍率引数を追加する修正は手間なので、
        // 既存のplayerAttackActionのロジックを流用しつつ計算する。

        // 弱点チェックなどはplayerAttackActionと同じだが、スキルごとの特殊処理が必要。
        // ここでは簡易実装として、物理ダメージスキルとして処理。

        // ダメージ計算
        let { damage, isCritical: randCrit } = calculateDamage({
          attack: activeMember.attack,
          defense: this.enemy.defense,
          isDefending: false,
          weaknessMultiplier: 1.0, // 弱点補正は別途乗るかも？スキル属性が必要だが、MVPではなし
          isBroken: this.enemy.isBroken,
        });

        damage = Math.floor(damage * multiplier);
        if (isCrit) {
          damage = Math.floor(damage * 1.5);
          randCrit = true; // クリティカル演出用
        }

        // シールド削減
        let isShieldBrokenNow = false;
        if (shieldDmg > 0 && !this.enemy.isBroken) {
          this.enemy.shield = Math.max(0, this.enemy.shield - shieldDmg);
          if (this.enemy.shield === 0) {
            this.enemy.isBroken = true;
            this.enemy.breakStartTurn = this.turnCount;
            isShieldBrokenNow = true;
          }
        }

        this.enemy.hp -= damage;

        // 演出
        this.showDamagePopup(this.enemySprite.x, this.enemySprite.y - 60, damage, randCrit);
        if (isShieldBrokenNow) this.showBreakEffect();
        this.updateEnemyStatusDisplay();

        this.showMessage(`${this.enemy.name}に${damage}のダメージ！`);

      } else if (ability.targetScope === 'all_allies') {
        // 味方全体回復
        const healAmount = ability.power || 0;

        this.partyMembers.forEach((member, i) => {
          if (member.hp > 0) { // 生存者のみ
            const oldHp = member.hp;
            member.hp = Math.min(member.maxHp, member.hp + healAmount);
            const healed = member.hp - oldHp;

            // 回復ポップアップ
            const sprite = this.partySprites[i];
            this.showDamagePopup(sprite.x, sprite.y - 40, healed, false);

            // 回復エフェクト（緑色に点滅）
            sprite.setTint(0x4ade80);
            this.time.delayedCall(300, () => sprite.clearTint());
          }
        });

        this.showMessage("味方全体のHPが回復した！");
      }

      this.updateHpDisplay();

      this.time.delayedCall(1500, () => {
        this.endTurnLogic();
      });
    });
  }

  /**
   * アイテム実行
   */
  private executeItem(itemId: string): void {
    const idx = this.activePartyMemberIndex;
    const activeMember = this.partyMembers[idx];
    const item = ITEMS[itemId];

    if (!item) return;

    // ATBを0にリセット
    activeMember.atb = 0;
    this.updateAtbBarForMember(idx);

    this.showMessage(`${activeMember.name}は ${item.name}をつかった！`);

    // アイテム使用アニメーション
    const sprite = this.partySprites[idx];
    this.tweens.add({
      targets: sprite,
      y: sprite.y - 10,
      duration: 100,
      yoyo: true,
      repeat: 1
    });

    this.time.delayedCall(800, () => {
      // 効果発動
      if (item.targetScope === 'single_ally') {
        const targetIdx = this.selectedTargetIndex;
        const targetMember = this.partyMembers[targetIdx];
        const targetSprite = this.partySprites[targetIdx];

        if (item.effectType === 'heal_hp') {
          const healAmount = item.effectValue || 0;
          const oldHp = targetMember.hp;
          targetMember.hp = Math.min(targetMember.maxHp, targetMember.hp + healAmount);
          const healed = targetMember.hp - oldHp;

          // 回復演出
          this.showDamagePopup(targetSprite.x, targetSprite.y - 40, healed, false);
          targetSprite.setTint(0x4ade80); // 緑
          this.time.delayedCall(300, () => targetSprite.clearTint());

          this.showMessage(`${targetMember.name}のHPが${healed}かいふくした！`);

        } else if (item.effectType === 'heal_mp') {
          const healAmount = item.effectValue || 0;
          targetMember.mp = Math.min(targetMember.maxMp, targetMember.mp + healAmount);

          // MP回復演出
          this.add.text(targetSprite.x, targetSprite.y - 60, `MP+${healAmount}`, {
            fontFamily: '"Press Start 2P"', fontSize: "16px", color: "#60a5fa", stroke: "#000", strokeThickness: 4
          }).setOrigin(0.5).setDepth(200);

          targetSprite.setTint(0x60a5fa); // 青
          this.time.delayedCall(300, () => targetSprite.clearTint());

          this.showMessage(`${targetMember.name}のMPが${healAmount}かいふくした！`);
        }
      }

      this.updateHpDisplay();

      this.time.delayedCall(1500, () => {
        this.endTurnLogic();
      });
    });
  }

  /**
   * ターン終了共通処理
   */
  private endTurnLogic(): void {
    if (this.enemy.hp <= 0) {
      this.victory();
    } else {
      // waiting状態に戻る
      this.battleState = "waiting";
      this.showMessage("");
      // ステートリセット
      this.currentAction = { type: 'attack' }; // default
      this.targetScope = 'single_enemy';
    }
  }

  /**
   * ダメージポップアップを表示
   */
  private showDamagePopup(
    x: number,
    y: number,
    damage: number,
    isCritical: boolean,
    isWeakness: boolean = false,
  ): void {
    const color = isCritical ? "#fbbf24" : isWeakness ? "#ef4444" : "#ffffff";
    const fontSize = isCritical ? "28px" : "24px";
    const text = isCritical ? `${damage}!` : `${damage}`;

    const popup = this.add.text(x, y, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: fontSize,
      color: color,
      stroke: "#000000",
      strokeThickness: 6,
    });
    popup.setOrigin(0.5);
    popup.setDepth(100);

    // アニメーション（上に浮かびながらフェードアウト）
    this.tweens.add({
      targets: popup,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => {
        popup.destroy();
      },
    });

    // クリティカル時は揺れ効果
    if (isCritical) {
      this.tweens.add({
        targets: popup,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  private showBreakEffect(): void {
    this.breakText.setVisible(true);
    this.breakText.setScale(0);
    this.breakText.setAlpha(1);

    // テキストのポップアニメーション（控えめに）
    this.tweens.add({
      targets: this.breakText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: this.breakText,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 150,
          ease: "Sine.out",
          onComplete: () => {
            // 少し表示してからフェードアウト
            this.tweens.add({
              targets: this.breakText,
              alpha: 0,
              duration: 400,
              delay: 800,
              onComplete: () => {
                this.breakText.setVisible(false);
              },
            });
          },
        });
      },
    });

    // 画面揺れ（控えめに）
    this.cameras.main.shake(200, 0.015);

    // 敵のフラッシュ（控えめに）
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0.6,
      duration: 80,
      yoyo: true,
      repeat: 2,
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
    this.stunStars.forEach((star) => star.setVisible(visible));
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
      const p1 = {
        x: Phaser.Math.Between(-s, s),
        y: Phaser.Math.Between(-s, s),
      };
      const p2 = {
        x: Phaser.Math.Between(-s, s),
        y: Phaser.Math.Between(-s, s),
      };
      const p3 = {
        x: Phaser.Math.Between(-s, s),
        y: Phaser.Math.Between(-s, s),
      };

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
        ease: "Cubic.out",
        onComplete: () => {
          shard.destroy();
        },
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
      ease: "Quad.out",
      onComplete: () => {
        ring.destroy();
      },
    });
  }

  /**
   * 毎フレーム更新（ATBゲージの回復処理）
   * 設計書3.5準拠: ATB回復速度 = (baseSpeed + characterSpeed/100)
   */
  update(time: number, delta: number): void {
    // バトル終了時は何もしない
    if (
      this.battleState === "start" ||
      this.battleState === "victory" ||
      this.battleState === "defeat" ||
      this.battleState === "escaped"
    ) {
      return;
    }

    // アクション実行中と敵ターン中のみATB停止
    // playerTurn、selectTarget、selectItem中もATBは進む（アクティブモード）
    if (this.battleState === "executing" || this.battleState === "enemyTurn") {
      return;
    }

    // フレームカウンター更新
    this.frameCounter++;

    // waiting状態: ATBを更新してターン開始判定
    const margin = 10;
    const uiY = GAME_HEIGHT - 150;
    const gap = 4;
    const totalWidth = GAME_WIDTH - margin * 2;
    const enemyWindowWidth = Math.floor(totalWidth * 0.35);
    const partyWindowX = margin + enemyWindowWidth + gap;
    const atbRelX = 350;
    const atbWidth = 90; // createUIと同じ値に修正
    const rowHeight = 32;

    // === パーティメンバーのATB回復 ===
    for (let i = 0; i < this.partyCount; i++) {
      const member = this.partyMembers[i];

      // 戦闘不能チェック
      if (member.hp <= 0) {
        member.atb = 0;
        this.atbFullTimestamps[i] = 0; // 戦闘不能時はリセット
        continue;
      }

      // ATBが満タンでない場合は回復
      if (member.atb < member.maxAtb) {
        // 設計書3.5.2: ATB回復速度 = (baseSpeed + characterSpeed/100)
        const atbRecovery =
          BATTLE_SYSTEM.ATB_BASE_SPEED + member.speed / BATTLE_SYSTEM.ATB_SPEED_DIVISOR;
        const oldAtb = member.atb;
        member.atb = Math.min(member.maxAtb, member.atb + atbRecovery);

        // ATBが今回満タンになった場合、タイムスタンプを記録
        if (oldAtb < member.maxAtb && member.atb >= member.maxAtb && this.atbFullTimestamps[i] === 0) {
          this.atbFullTimestamps[i] = this.frameCounter;
        }
      }

      // ATBバーを更新（満タンでも常に描画）
      const rowY = uiY + 20 + i * rowHeight;
      const atbAbsX = partyWindowX + atbRelX;

      this.drawAtbBar(
        this.partyAtbBars[i],
        atbAbsX + 2,
        rowY + 2, // 枠内に収める
        atbWidth - 4,
        6,
        member.atb,
        member.maxAtb,
      );

      // ATB満タン矢印の更新（キャラの上に下向き矢印）
      // ただし、ターゲット選択中（all_allies）は updateTargetCursor で制御するのでスキップ
      if (this.readyArrows[i] && !(this.battleState === 'selectTarget' && this.targetScope === 'all_allies')) {
        const sprite = this.partySprites[i];
        if (sprite && member.hp > 0 && member.atb >= member.maxAtb) {
          // キャラの頭上に下向き矢印を表示
          this.readyArrows[i].setPosition(
            sprite.x,
            sprite.y - sprite.height - 50
          );
          this.readyArrows[i].setVisible(true);
        } else {
          this.readyArrows[i].setVisible(false);
        }
      }
    }

    // === 敵のATB回復 ===
    if (this.enemy.hp > 0 && this.enemy.atb < this.enemy.maxAtb) {
      const enemyAtbRecovery =
        BATTLE_SYSTEM.ATB_BASE_SPEED + this.enemy.speed / BATTLE_SYSTEM.ATB_SPEED_DIVISOR;
      this.enemy.atb = Math.min(
        this.enemy.maxAtb,
        this.enemy.atb + enemyAtbRecovery,
      );
    }

    // === ターン開始判定 ===
    // 既にコマンド選択中やターゲット選択中の場合はスキップ
    if (
      this.battleState === "playerTurn" ||
      this.battleState === "selectTarget" ||
      this.battleState === "selectItem"
    ) {
      // 既に行動中のため、新たなターン開始はしない
      return;
    }

    // 生存しているパーティメンバーのインデックスを取得
    const livingMemberIndices = this.partyMembers
      .map((m, i) => ({ hp: m.hp, index: i }))
      .filter((item) => item.hp > 0)
      .map((item) => item.index);

    // 全員が行動済みかチェック
    const allActed = livingMemberIndices.every((i) =>
      this.actedPartyMemberIndices.has(i)
    );

    // 全員が行動済みならターンリセット
    if (allActed && livingMemberIndices.length > 0) {
      this.turnCount++;
      this.turnText.setText(`TURN: ${this.turnCount}`);
      this.actedPartyMemberIndices.clear();
      // ATB満タン時刻をリセットし、既に満タンのキャラに新しいタイムスタンプを付与
      this.atbFullTimestamps = this.atbFullTimestamps.map(() => 0);
      // 既にATB満タンのキャラに即座にタイムスタンプを記録
      for (let i = 0; i < this.partyCount; i++) {
        const m = this.partyMembers[i];
        if (m.hp > 0 && m.atb >= m.maxAtb) {
          this.atbFullTimestamps[i] = this.frameCounter + i; // 同時の場合はインデックス順
        }
      }
    }

    // パーティメンバーでATBが満タンで、かつ今ターン未行動のキャラを抽出
    const readyMembers = this.partyMembers
      .map((m, i) => ({ member: m, index: i, timestamp: this.atbFullTimestamps[i] }))
      .filter(
        (item) =>
          item.member.hp > 0 &&
          item.member.atb >= item.member.maxAtb &&
          !this.actedPartyMemberIndices.has(item.index) &&
          item.timestamp > 0, // タイムスタンプが記録されている
      );

    // タイムスタンプ順（早い順）にソート
    readyMembers.sort((a, b) => a.timestamp - b.timestamp);

    if (readyMembers.length > 0) {
      const firstReady = readyMembers[0];
      this.activePartyMemberIndex = firstReady.index;
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
