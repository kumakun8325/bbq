/**
 * BBQ - 型定義
 */

/** 座標 */
export interface Position {
    x: number;
    y: number;
}

/** 弱点属性タイプ (武器種 + 魔法属性) */
export type WeaknessType = 'sword' | 'spear' | 'dagger' | 'axe' | 'bow' | 'staff' | 'fire' | 'ice' | 'lightning' | 'wind' | 'light' | 'dark';

/** キャラクターステータス */
export interface CharacterStats {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
    exp: number;
}

/** キャラクター定義（不変データ） */
export interface CharacterDefinition {
    id: string;
    name: string;
    initialStats: CharacterStats;
    spriteKey: string;
    battleSpriteKey: string;
    defaultWeapon: WeaknessType;
    specialCommandName: string; // 固有技名
    abilityId: string; // 固有アビリティID
}

/** キャラクターインスタンス（可変データ） */
export interface CharacterInstance extends CharacterDefinition {
    currentStats: CharacterStats;
    currentHp: number;
    currentMp: number;
    currentAtb: number;
    isDead: boolean;
    isDefending: boolean;
}

/** 敵データ */
export interface EnemyData {
    id: string;
    name: string;
    stats: CharacterStats;
    weakness: WeaknessType[];
    shieldPoints: number;
    drops: ItemDrop[];
    expReward: number;
    goldReward: number;
    spriteKey: string;
    // ブレイクシステム用
    shield: number;
    maxShield: number;
    isBroken: boolean;
    revealedWeaknesses: boolean[];
    breakStartTurn: number;
}

/** アイテムドロップ */
export interface ItemDrop {
    itemId: string;
    chance: number;
}

/** バトルコマンド */
export type BattleCommand = 'attack' | 'defend' | 'skill' | 'item' | 'escape';

/** バトルステート */
export type BattleState =
    | 'start'
    | 'playerTurn'
    | 'selectCommand'
    | 'selectItem'      // アイテム選択
    | 'selectTarget'    // ターゲット選択
    | 'executeAction'
    | 'enemyTurn'
    | 'checkResult'
    | 'victory'
    | 'defeat'
    | 'escaped'
    | 'waiting'         // ATB待機中
    | 'executing';      // アクション実行中

/** バトル中のパーティメンバーデータ */
export interface PartyMemberBattleData {
    name: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed: number;
    atb: number;
    maxAtb: number;
    spriteKey: string;
    isDefending: boolean;
    weaponType: WeaknessType;
    abilityId: string;
}

/** バトル中の敵データ */
export interface EnemyBattleData {
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    atb: number;
    maxAtb: number;
    color: number;
    width: number;
    height: number;
    spriteKey: string;
    shield: number;
    maxShield: number;
    weaknesses: WeaknessType[];
    revealedWeaknesses: boolean[];
    isBroken: boolean;
    breakStartTurn: number;
}

/** ターゲット選択結果 */
export interface TargetSelectionResult {
    type: 'enemy' | 'party';
    index: number;
}

/** ダメージ計算結果 */
export interface DamageResult {
    damage: number;
    isCritical: boolean;
}

/** セーブデータ */
export interface SaveData {
    version: string;
    timestamp: number;
    party: PartyMember[];
    inventory: InventoryItem[];
    progress: GameProgress;
    playtime: number;
}

/** パーティメンバー */
export interface PartyMember {
    id: string;
    name: string;
    stats: CharacterStats;
    equipment: Equipment;
}

/** 装備 */
export interface Equipment {
    weapon?: string;
    armor?: string;
    accessory?: string;
}

/** インベントリアイテム */
export interface InventoryItem {
    itemId: string;
    quantity: number;
}

/** ゲーム進行状況 */
export interface GameProgress {
    currentMap: string;
    position: Position;
    flags: Record<string, boolean>;
}

/** シーン遷移データ */
export interface SceneTransitionData {
    returnScene?: string;
    playerPosition?: Position;
    [key: string]: unknown;
}

/** ターゲット範囲 */
export type TargetScope = 'self' | 'single_ally' | 'all_allies' | 'single_enemy' | 'all_enemies';

/** アビリティ定義 */
export interface AbilityDefinition {
    id: string;
    name: string;
    description: string;
    mpCost: number;
    targetScope: TargetScope;
    power?: number;  // 威力倍率 (例: 1.5)
    effectType?: 'damage' | 'heal_hp' | 'heal_mp' | 'buff' | 'debuff' | 'special';
    // 特殊効果パラメータ
    shieldDamage?: number; // シールド削減値
    isCritical?: boolean;  // 確定クリティカル
}

/** アイテムタイプ */
export type ItemType = 'consumable' | 'weapon' | 'armor' | 'accessory' | 'key';

/** アイテム定義 */
export interface ItemDefinition {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    targetScope?: TargetScope;
    effectType?: 'heal_hp' | 'heal_mp' | 'revive' | 'buff' | 'special';
    effectValue?: number; // 回復量など
    price: number;
}
