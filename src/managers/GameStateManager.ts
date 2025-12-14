
import { CharacterInstance, GameProgress } from '@/types';
import { PLAYABLE_CHARACTERS } from '@/data/characters';
import { applyExperience, LevelUpResult } from '@/systems/LevelUpSystem';

/** 経験値付与結果（各メンバーごと） */
export interface ExperienceResult {
    memberId: string;
    memberName: string;
    expGained: number;
    levelUpResult: LevelUpResult | null;
}

export class GameStateManager {
    private static instance: GameStateManager;

    // ゲーム状態
    private party: CharacterInstance[] = [];
    private progress: GameProgress;

    private constructor() {
        // 初期状態のセットアップ
        this.progress = {
            currentMap: 'map-field01',
            position: { x: 300, y: 300 },
            flags: {}
        };
        this.initializeParty();
    }

    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    /**
     * パーティの初期化（ニューゲーム時など）
     */
    public initializeParty(): void {
        const initialMembers = ['torikun', 'daichan', 'shinichi', 'taisa'];
        this.party = initialMembers.map(id => {
            const def = PLAYABLE_CHARACTERS[id];
            return {
                ...def,
                currentStats: { ...def.initialStats }, // コピーを作成
                currentHp: def.initialStats.maxHp,
                currentMp: def.initialStats.maxMp,
                currentAtb: 0, // バトル開始時にランダムセットされるが、初期値として0
                isDead: false,
                isDefending: false
            };
        });
    }

    /**
     * パーティメンバーを取得
     */
    public getParty(): CharacterInstance[] {
        return this.party;
    }

    /**
     * 戦闘後の状態更新
     * @param updatedMembers 戦闘終了時のメンバー状態
     */
    public updatePartyAfterBattle(updatedMembers: CharacterInstance[]): void {
        // 状態を同期（HPや経験値など）
        updatedMembers.forEach((updated, index) => {
            if (this.party[index]) {
                const member = this.party[index];
                member.currentHp = updated.currentHp;
                member.currentMp = updated.currentMp;
                member.isDead = updated.currentHp <= 0;
                // 経験値とステータスも同期
                member.currentStats = { ...updated.currentStats };
            }
        });
    }

    /**
     * 経験値を生存メンバーに付与し、レベルアップ判定を行う
     * @param expAmount 獲得経験値
     * @returns 各メンバーの経験値獲得・レベルアップ結果
     */
    public awardExperience(expAmount: number): ExperienceResult[] {
        const results: ExperienceResult[] = [];

        this.party.forEach(member => {
            // 戦闘不能メンバーは経験値獲得なし
            if (member.isDead || member.currentHp <= 0) {
                results.push({
                    memberId: member.id,
                    memberName: member.name,
                    expGained: 0,
                    levelUpResult: null
                });
                return;
            }

            // 経験値付与とレベルアップ判定
            const levelUpResult = applyExperience(
                member,
                expAmount,
                member.growthRates
            );

            results.push({
                memberId: member.id,
                memberName: member.name,
                expGained: expAmount,
                levelUpResult
            });
        });

        return results;
    }

    /**
     * 全回復（宿屋など）
     */
    public fullHeal(): void {
        this.party.forEach(member => {
            member.currentHp = member.currentStats.maxHp;
            member.currentMp = member.currentStats.maxMp;
            member.isDead = false;
        });
    }

    // --- 進行状況管理 ---

    public getProgress(): GameProgress {
        return this.progress;
    }

    public setPosition(x: number, y: number): void {
        this.progress.position = { x, y };
    }

    public setMap(mapName: string): void {
        this.progress.currentMap = mapName;
    }
}
