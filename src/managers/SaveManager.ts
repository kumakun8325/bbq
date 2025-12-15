/**
 * セーブ/ロードマネージャー
 * LocalStorageを使用してゲームデータの永続化を管理
 * 複数スロット対応（オートセーブ + 手動セーブ）
 */

import { CharacterInstance, GameProgress, InventoryItem } from '@/types';
import { GameStateManager } from '@/managers/GameStateManager';

/** セーブデータのバージョン */
const SAVE_DATA_VERSION = '1.0.0';

/** LocalStorageのキープレフィックス */
const SAVE_KEY_PREFIX = 'bbq_save_';
const SETTINGS_KEY = 'bbq_settings';

/** スロット定義 */
export const SAVE_SLOTS = {
    AUTO: 0,
    SLOT1: 1,
    SLOT2: 2,
    SLOT3: 3
} as const;

export type SaveSlotId = typeof SAVE_SLOTS[keyof typeof SAVE_SLOTS];

/** スロット名 */
export const SLOT_NAMES: Record<SaveSlotId, string> = {
    [SAVE_SLOTS.AUTO]: 'オートセーブ',
    [SAVE_SLOTS.SLOT1]: 'スロット1',
    [SAVE_SLOTS.SLOT2]: 'スロット2',
    [SAVE_SLOTS.SLOT3]: 'スロット3'
};

/** マップ名（日本語） */
const MAP_NAMES: Record<string, string> = {
    'map-field01': 'フィールド',
    'map-dungeon01': 'ダンジョン',
    'map-town01': '街'
};

/** セーブデータ構造 */
export interface SaveData {
    version: string;
    timestamp: number;
    party: SavedCharacter[];
    inventory: InventoryItem[];
    progress: GameProgress;
    playtime: number; // 秒単位
}

/** 保存用キャラクターデータ */
export interface SavedCharacter {
    id: string;
    currentHp: number;
    currentMp: number;
    isDead: boolean;
    currentStats: {
        hp: number;
        maxHp: number;
        mp: number;
        maxMp: number;
        attack: number;
        defense: number;
        speed: number;
        level: number;
        exp: number;
    };
}

/** セーブスロット情報（UI表示用） */
export interface SaveSlotInfo {
    slotId: SaveSlotId;
    slotName: string;
    isEmpty: boolean;
    timestamp?: string;
    playtime?: string;
    location?: string;
    maxLevel?: number;
    partyIds?: string[];
}

/** 設定データ */
export interface SettingsData {
    bgmVolume: number;
    seVolume: number;
    battleSpeed: 'slow' | 'normal' | 'fast';
}

export class SaveManager {
    private static instance: SaveManager;
    private playtimeStarted: number = 0;
    private totalPlaytime: number = 0;

    private constructor() {
        this.playtimeStarted = Date.now();
    }

    public static getInstance(): SaveManager {
        if (!SaveManager.instance) {
            SaveManager.instance = new SaveManager();
        }
        return SaveManager.instance;
    }

    /**
     * スロットのキーを取得
     */
    private getSlotKey(slotId: SaveSlotId): string {
        return `${SAVE_KEY_PREFIX}${slotId}`;
    }

    /**
     * セーブデータが存在するかチェック（任意のスロット）
     */
    public hasSaveData(): boolean {
        return this.hasSlotData(SAVE_SLOTS.AUTO) ||
            this.hasSlotData(SAVE_SLOTS.SLOT1) ||
            this.hasSlotData(SAVE_SLOTS.SLOT2) ||
            this.hasSlotData(SAVE_SLOTS.SLOT3);
    }

    /**
     * 特定スロットにデータが存在するかチェック
     */
    public hasSlotData(slotId: SaveSlotId): boolean {
        try {
            const data = localStorage.getItem(this.getSlotKey(slotId));
            return data !== null;
        } catch {
            return false;
        }
    }

    /**
     * ゲームをセーブ（指定スロット）
     */
    public save(slotId: SaveSlotId = SAVE_SLOTS.AUTO): boolean {
        try {
            const gameState = GameStateManager.getInstance();
            const party = gameState.getParty();
            const progress = gameState.getProgress();

            // プレイ時間を更新
            const currentSession = (Date.now() - this.playtimeStarted) / 1000;
            const totalPlaytime = this.totalPlaytime + currentSession;

            const saveData: SaveData = {
                version: SAVE_DATA_VERSION,
                timestamp: Date.now(),
                party: party.map(member => this.serializeCharacter(member)),
                inventory: [],
                progress: {
                    currentMap: progress.currentMap,
                    position: { ...progress.position },
                    flags: { ...progress.flags }
                },
                playtime: totalPlaytime
            };

            localStorage.setItem(this.getSlotKey(slotId), JSON.stringify(saveData));
            console.log(`Game saved to slot ${slotId}`, saveData);
            return true;
        } catch (error) {
            console.error('Failed to save game:', error);
            return false;
        }
    }

    /**
     * ゲームをロード（指定スロット）
     */
    public load(slotId: SaveSlotId = SAVE_SLOTS.AUTO): SaveData | null {
        try {
            const dataStr = localStorage.getItem(this.getSlotKey(slotId));
            if (!dataStr) {
                return null;
            }

            const saveData: SaveData = JSON.parse(dataStr);

            // バージョンチェック
            if (saveData.version !== SAVE_DATA_VERSION) {
                console.warn(`Save data version mismatch: ${saveData.version} vs ${SAVE_DATA_VERSION}`);
            }

            // プレイ時間を復元
            this.totalPlaytime = saveData.playtime || 0;
            this.playtimeStarted = Date.now();

            return saveData;
        } catch (error) {
            console.error('Failed to load game:', error);
            return null;
        }
    }

    /**
     * セーブデータをGameStateに適用
     */
    public applyToGameState(saveData: SaveData): void {
        const gameState = GameStateManager.getInstance();

        gameState.restoreParty(saveData.party);
        gameState.setMap(saveData.progress.currentMap);
        gameState.setPosition(
            saveData.progress.position.x,
            saveData.progress.position.y
        );

        Object.entries(saveData.progress.flags).forEach(([key, value]) => {
            gameState.setFlag(key, value);
        });

        console.log('Game state restored from save data');
    }

    /**
     * セーブデータを削除
     */
    public deleteSave(slotId: SaveSlotId): boolean {
        try {
            localStorage.removeItem(this.getSlotKey(slotId));
            console.log(`Save data deleted from slot ${slotId}`);
            return true;
        } catch (error) {
            console.error('Failed to delete save:', error);
            return false;
        }
    }

    /**
     * 全スロットの情報を取得（UI表示用）
     */
    public getAllSlotInfo(): SaveSlotInfo[] {
        const slots: SaveSlotInfo[] = [];

        for (const slotId of [SAVE_SLOTS.AUTO, SAVE_SLOTS.SLOT1, SAVE_SLOTS.SLOT2, SAVE_SLOTS.SLOT3]) {
            const saveData = this.load(slotId);

            if (saveData) {
                const date = new Date(saveData.timestamp);
                const maxLevel = Math.max(...saveData.party.map(p => p.currentStats.level));

                slots.push({
                    slotId,
                    slotName: SLOT_NAMES[slotId],
                    isEmpty: false,
                    timestamp: this.formatDate(date),
                    playtime: this.formatPlaytime(saveData.playtime),
                    location: MAP_NAMES[saveData.progress.currentMap] || saveData.progress.currentMap,
                    maxLevel,
                    partyIds: saveData.party.map(p => p.id)
                });
            } else {
                slots.push({
                    slotId,
                    slotName: SLOT_NAMES[slotId],
                    isEmpty: true
                });
            }
        }

        return slots;
    }

    /**
     * 設定を保存
     */
    public saveSettings(settings: SettingsData): boolean {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 設定を読込
     */
    public loadSettings(): SettingsData {
        try {
            const dataStr = localStorage.getItem(SETTINGS_KEY);
            if (dataStr) {
                return JSON.parse(dataStr);
            }
        } catch {
            console.error('Failed to load settings');
        }

        return {
            bgmVolume: 0.7,
            seVolume: 1.0,
            battleSpeed: 'normal'
        };
    }

    /**
     * 日付をフォーマット
     */
    private formatDate(date: Date): string {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${minutes}`;
    }

    /**
     * プレイ時間をフォーマット
     */
    private formatPlaytime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * CharacterInstanceをセーブ形式に変換
     */
    private serializeCharacter(member: CharacterInstance): SavedCharacter {
        return {
            id: member.id,
            currentHp: member.currentHp,
            currentMp: member.currentMp,
            isDead: member.isDead,
            currentStats: {
                hp: member.currentStats.hp,
                maxHp: member.currentStats.maxHp,
                mp: member.currentStats.mp,
                maxMp: member.currentStats.maxMp,
                attack: member.currentStats.attack,
                defense: member.currentStats.defense,
                speed: member.currentStats.speed,
                level: member.currentStats.level,
                exp: member.currentStats.exp
            }
        };
    }
}
