/**
 * BBQ - 型定義
 */

/** 座標 */
export interface Position {
    x: number;
    y: number;
}

/** 属性タイプ */
export type ElementType = 'fire' | 'ice' | 'thunder' | 'wind' | 'light' | 'dark' | 'physical';

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

/** 敵データ */
export interface EnemyData {
    id: string;
    name: string;
    stats: CharacterStats;
    weakness: ElementType[];
    shieldPoints: number;
    drops: ItemDrop[];
    expReward: number;
    goldReward: number;
    spriteKey: string;
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
    | 'selectTarget'
    | 'executeAction'
    | 'enemyTurn'
    | 'checkResult'
    | 'victory'
    | 'defeat'
    | 'escaped';

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
